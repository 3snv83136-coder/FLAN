import { redirect } from "next/navigation";
import Link from "next/link";
import { requireProfile } from "@/lib/auth/profile";
import { createClientReadOnly } from "@/lib/supabase/server";
import { ColorContainer } from "@/components/ui/color-container";
import { sitePhotoUrl } from "@/lib/storage/site-photos";
import {
  PosCreateForm,
  PosEditForm,
} from "@/components/reglages/pos-manager";
import {
  ProductCreateForm,
  ProductEditForm,
} from "@/components/reglages/product-manager";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TONES = [
  "jaune",
  "vert",
  "violet",
  "rose",
  "orange",
  "cyan",
] as const;

export default async function ReglagesPage({
  searchParams,
}: {
  searchParams: { onglet?: string };
}) {
  const profile = await requireProfile();
  if (profile.role !== "gerant") redirect("/vente");

  const onglet = searchParams.onglet === "produits" ? "produits" : "magasins";
  const supabase = createClientReadOnly();

  const { data: posRows, error: posError } = await supabase
    .from("points_of_sale")
    .select("id, name, type, address, is_active, photo_path")
    .order("name");

  const { data: productRows, error: productError } = await supabase
    .from("products")
    .select("id, name, description, price_cents, is_active, photo_path")
    .order("name");

  const schemaMissing =
    posError?.message?.includes("photo_path") ||
    productError?.message?.includes("photo_path") ||
    posError?.message?.includes("schema cache") ||
    productError?.message?.includes("schema cache");

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl text-white">Site</h1>
        <p className="text-sm text-gris">
          Back-office gérant — magasins, photos, produits, prix
        </p>
      </header>

      {schemaMissing ? (
        <ColorContainer tone="orange" title="Base pas à jour">
          <p className="text-sm">
            Lance 0009_site_photos.sql dans le SQL Editor Supabase, puis
            recharge cette page.
          </p>
        </ColorContainer>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/reglages?onglet=magasins"
          className={cn(
            "flex min-h-12 items-center justify-center rounded-xl text-sm font-semibold",
            onglet === "magasins"
              ? "bg-container-jaune text-brun"
              : "bg-white/15 text-white",
          )}
        >
          Magasins
        </Link>
        <Link
          href="/reglages?onglet=produits"
          className={cn(
            "flex min-h-12 items-center justify-center rounded-xl text-sm font-semibold",
            onglet === "produits"
              ? "bg-container-jaune text-brun"
              : "bg-white/15 text-white",
          )}
        >
          Produits
        </Link>
      </div>

      {onglet === "magasins" ? (
        <>
          <ColorContainer
            tone="jaune"
            title="Nouveau magasin"
            subtitle="Nom, type, adresse, photo"
          >
            <PosCreateForm />
          </ColorContainer>
          <div className="grid gap-4 lg:grid-cols-2">
            {(posRows ?? []).map((pos, i) => (
              <ColorContainer
                key={pos.id as string}
                tone={TONES[i % TONES.length]}
                title={pos.name as string}
                subtitle={pos.is_active ? "Ouvert" : "Fermé"}
              >
                <PosEditForm
                  pos={{
                    id: pos.id as string,
                    name: pos.name as string,
                    type: pos.type as string,
                    address: (pos.address as string | null) ?? null,
                    is_active: Boolean(pos.is_active),
                    photo_url: sitePhotoUrl(pos.photo_path as string | null),
                  }}
                />
              </ColorContainer>
            ))}
          </div>
        </>
      ) : (
        <>
          <ColorContainer
            tone="orange"
            title="Nouveau produit"
            subtitle="Nom, prix, photo — visible à la caisse"
          >
            <ProductCreateForm />
          </ColorContainer>
          <div className="grid gap-4 lg:grid-cols-2">
            {(productRows ?? []).map((p, i) => (
              <ColorContainer
                key={p.id as string}
                tone={TONES[i % TONES.length]}
                title={p.name as string}
                subtitle={p.is_active ? "En vente" : "Masqué"}
              >
                <ProductEditForm
                  product={{
                    id: p.id as string,
                    name: p.name as string,
                    description: (p.description as string | null) ?? null,
                    price_cents: p.price_cents as number,
                    is_active: Boolean(p.is_active),
                    photo_url: sitePhotoUrl(p.photo_path as string | null),
                  }}
                />
              </ColorContainer>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
