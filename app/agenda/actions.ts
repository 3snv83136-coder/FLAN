"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  hoursBetweenTimes,
  isoWeekdayFromYmd,
  parisYmd,
  planningWindow,
  startOfWeekMonday,
  timeToIsoOnDay,
} from "@/lib/agenda/dates";

async function requireGerant() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non connecté." as const, userId: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "gerant") {
    return { error: "Réservé au gérant." as const, userId: null };
  }
  return { error: null, userId: user.id };
}

export async function createEmployee(formData: FormData) {
  const gate = await requireGerant();
  if (gate.error) return { error: gate.error };

  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "vendeur");
  const contractType = String(formData.get("contract_type") ?? "") || null;
  const weekdays = formData
    .getAll("work_weekdays")
    .map((v) => Number(v))
    .filter((n) => n >= 1 && n <= 7);

  if (!fullName) return { error: "Indique le nom du salarié." };
  if (!["vendeur", "producteur", "gerant"].includes(role)) {
    return { error: "Rôle invalide." };
  }

  const slug = fullName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");
  const email = `${slug}.${Date.now().toString(36)}@flan.local`;

  const admin = createAdminClient();
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (authError || !created.user) {
    return { error: authError?.message ?? "Impossible de créer le compte." };
  }

  let posId: string | null = null;
  if (role === "vendeur") {
    const { data: pos } = await admin
      .from("points_of_sale")
      .select("id")
      .eq("is_active", true)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    posId = (pos?.id as string | undefined) ?? null;
    if (!posId) {
      return { error: "Crée d’abord un point de vente pour rattacher un vendeur." };
    }
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    full_name: fullName,
    role,
    point_of_sale_id: posId,
    is_active: true,
    contract_type: contractType,
    work_weekdays: weekdays.length ? weekdays : [1, 2, 3, 4, 5],
    usual_start_time: String(formData.get("usual_start_time") || "09:00"),
    usual_end_time: String(formData.get("usual_end_time") || "17:00"),
    max_hours_per_week: formData.get("max_hours_per_week")
      ? Number(formData.get("max_hours_per_week"))
      : null,
    constraint_notes: String(formData.get("constraint_notes") ?? "").trim() || null,
  });

  if (profileError) {
    return { error: profileError.message };
  }

  revalidatePath("/agenda");
  return { ok: true as const };
}

export async function updateEmployeeHr(formData: FormData) {
  const gate = await requireGerant();
  if (gate.error) return { error: gate.error };

  const profileId = String(formData.get("profile_id") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const contractType = String(formData.get("contract_type") ?? "") || null;
  const weekdays = formData
    .getAll("work_weekdays")
    .map((v) => Number(v))
    .filter((n) => n >= 1 && n <= 7);

  if (!profileId || !fullName) return { error: "Nom manquant." };

  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      contract_type: contractType,
      work_weekdays: weekdays,
      usual_start_time: String(formData.get("usual_start_time") || "09:00"),
      usual_end_time: String(formData.get("usual_end_time") || "17:00"),
      max_hours_per_week: formData.get("max_hours_per_week")
        ? Number(formData.get("max_hours_per_week"))
        : null,
      constraint_notes: String(formData.get("constraint_notes") ?? "").trim() || null,
    })
    .eq("id", profileId);

  if (error) return { error: error.message };
  revalidatePath("/agenda");
  return { ok: true as const };
}

export async function addAgendaItem(formData: FormData) {
  const gate = await requireGerant();
  if (gate.error) return { error: gate.error };

  const profileId = String(formData.get("profile_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const startsLocal = String(formData.get("starts_at") ?? "");
  const endsLocal = String(formData.get("ends_at") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!profileId || !title || !startsLocal) {
    return { error: "Titre et horaire de début obligatoires." };
  }

  const supabase = createClient();
  const { data: person } = await supabase
    .from("profiles")
    .select("work_weekdays, max_hours_per_week")
    .eq("id", profileId)
    .single();

  const starts = new Date(startsLocal);
  const parisDay = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(starts);
  const wd = isoWeekdayFromYmd(parisDay);
  const weekdays = (person?.work_weekdays as number[] | null) ?? [1, 2, 3, 4, 5];
  if (!weekdays.includes(wd)) {
    return {
      error: "Jour off pour cette personne (contrainte jours travaillés).",
    };
  }

  const { error } = await supabase.from("agenda_items").insert({
    profile_id: profileId,
    title,
    notes,
    starts_at: new Date(startsLocal).toISOString(),
    ends_at: endsLocal ? new Date(endsLocal).toISOString() : null,
  });

  if (error) return { error: error.message };
  revalidatePath("/agenda");
  return { ok: true as const };
}

export async function deleteAgendaItem(itemId: string) {
  const gate = await requireGerant();
  if (gate.error) return { error: gate.error };

  const supabase = createClient();
  const { error } = await supabase.from("agenda_items").delete().eq("id", itemId);
  if (error) return { error: error.message };
  revalidatePath("/agenda");
  return { ok: true as const };
}

export async function generatePlanning(formData: FormData) {
  const gate = await requireGerant();
  if (gate.error) return { error: gate.error };

  const vue = String(formData.get("vue") ?? "semaine") === "mois" ? "mois" : "semaine";
  const from = String(formData.get("from") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    return { error: "Période invalide." };
  }

  const window = planningWindow(vue, from);
  const supabase = createClient();

  const { data: staff, error: staffError } = await supabase
    .from("profiles")
    .select(
      "id, full_name, role, work_weekdays, usual_start_time, usual_end_time, max_hours_per_week",
    )
    .eq("is_active", true);

  if (staffError) return { error: staffError.message };

  const rangeStart = `${window.from}T00:00:00.000Z`;
  const rangeEnd = `${window.to}T23:59:59.999Z`;
  const { data: existing } = await supabase
    .from("agenda_items")
    .select("id, profile_id, starts_at, ends_at")
    .gte("starts_at", rangeStart)
    .lte("starts_at", rangeEnd);

  const existingByProfileDay = new Set(
    (existing ?? []).map((e) => {
      const day = parisYmd(new Date(e.starts_at as string));
      return `${e.profile_id}:${day}`;
    }),
  );

  const hoursByProfileWeek = new Map<string, number>();
  for (const e of existing ?? []) {
    const day = parisYmd(new Date(e.starts_at as string));
    const week = startOfWeekMonday(day);
    const start = new Date(e.starts_at as string).getTime();
    const end = e.ends_at
      ? new Date(e.ends_at as string).getTime()
      : start + 8 * 3600_000;
    const hrs = Math.max(0, (end - start) / 3600_000);
    const key = `${e.profile_id}:${week}`;
    hoursByProfileWeek.set(key, (hoursByProfileWeek.get(key) ?? 0) + hrs);
  }

  const toInsert: Array<{
    profile_id: string;
    title: string;
    notes: string | null;
    starts_at: string;
    ends_at: string;
  }> = [];
  const skipped: string[] = [];

  for (const person of staff ?? []) {
    const weekdays = (person.work_weekdays as number[] | null) ?? [1, 2, 3, 4, 5];
    const startT = String(person.usual_start_time ?? "09:00").slice(0, 5);
    const endT = String(person.usual_end_time ?? "17:00").slice(0, 5);
    const shiftHours = hoursBetweenTimes(startT, endT);
    const maxH = person.max_hours_per_week
      ? Number(person.max_hours_per_week)
      : null;
    const title =
      person.role === "producteur"
        ? "Production"
        : person.role === "gerant"
          ? "Gestion"
          : "Vente";

    for (const day of window.days) {
      const wd = isoWeekdayFromYmd(day);
      if (!weekdays.includes(wd)) continue;
      if (existingByProfileDay.has(`${person.id}:${day}`)) continue;

      const week = startOfWeekMonday(day);
      const weekKey = `${person.id}:${week}`;
      const already = hoursByProfileWeek.get(weekKey) ?? 0;
      if (maxH != null && already + shiftHours > maxH + 0.01) {
        skipped.push(
          `${person.full_name} ${day} : plafond ${maxH} h / semaine`,
        );
        continue;
      }

      toInsert.push({
        profile_id: person.id as string,
        title,
        notes: "Généré selon contraintes (jours + horaires)",
        starts_at: timeToIsoOnDay(day, startT),
        ends_at: timeToIsoOnDay(day, endT),
      });
      hoursByProfileWeek.set(weekKey, already + shiftHours);
      existingByProfileDay.add(`${person.id}:${day}`);
    }
  }

  if (toInsert.length) {
    const { error } = await supabase.from("agenda_items").insert(toInsert);
    if (error) return { error: error.message };
  }

  revalidatePath("/agenda");
  return {
    ok: true as const,
    created: toInsert.length,
    skipped: skipped.slice(0, 8),
  };
}

export async function clockEvent(profileId: string, kind: "debut" | "fin") {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non connecté." };

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const targetId = me?.role === "gerant" ? profileId : user.id;

  const { error } = await supabase.from("time_clock_events").insert({
    profile_id: targetId,
    kind,
    clocked_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };
  revalidatePath("/agenda");
  return { ok: true as const };
}

export async function uploadEmployeeDocument(formData: FormData) {
  const gate = await requireGerant();
  if (gate.error) return { error: gate.error };
  if (!gate.userId) return { error: "Non connecté." };

  const profileId = String(formData.get("profile_id") ?? "");
  const kind = String(formData.get("kind") ?? "contrat");
  const file = formData.get("file");

  if (!profileId || !(file instanceof File) || file.size === 0) {
    return { error: "Choisis un scan (photo ou PDF)." };
  }
  if (!["contrat", "autre"].includes(kind)) {
    return { error: "Type de document invalide." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${profileId}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from("employee_documents")
    .upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) return { error: uploadError.message };

  const { error: rowError } = await admin.from("employee_documents").insert({
    profile_id: profileId,
    kind,
    file_path: path,
    original_name: file.name,
    uploaded_by: gate.userId,
  });

  if (rowError) return { error: rowError.message };
  revalidatePath("/agenda");
  return { ok: true as const };
}

export async function signedDocumentUrl(filePath: string) {
  const gate = await requireGerant();
  if (gate.error) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Non connecté." as const, url: null };
    if (!filePath.startsWith(`${user.id}/`)) {
      return { error: "Accès refusé." as const, url: null };
    }
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("employee_documents")
    .createSignedUrl(filePath, 60 * 10);

  if (error || !data?.signedUrl) {
    return { error: error?.message ?? "Lien impossible.", url: null };
  }
  return { error: null, url: data.signedUrl };
}
