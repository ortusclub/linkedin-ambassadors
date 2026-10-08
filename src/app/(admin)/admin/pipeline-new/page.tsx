import { redirect } from "next/navigation";

// The v2 pipeline is now the canonical /admin/pipeline. This path is kept only so old links
// and bookmarks to /admin/pipeline-new still land in the right place.
export default function PipelineNewRedirect() {
  redirect("/admin/pipeline");
}
