import { PostEditorScreen } from "../../_components/post-editor-screen";

export default async function GrowthPostEditPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  return <PostEditorScreen mode="edit" postId={postId} />;
}
