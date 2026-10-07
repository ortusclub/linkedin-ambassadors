import { getBrand } from "@/lib/brand";
import { CatalogueView } from "./catalogue-view";

// Server wrapper: resolve the brand from the host so the catalogue reads "hire" (LinkedArmy)
// or "rent" (LinkedVelocity) without a client-side flash. Metadata lives in layout.tsx.
export default async function CataloguePage() {
  const brand = await getBrand();
  return <CatalogueView isArmy={brand.id === "linkedarmy"} />;
}
