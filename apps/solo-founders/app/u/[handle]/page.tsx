import { FounderStudio } from "../../founder-studio";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  return (
    <main>
      <header className="masthead">
        <a className="brand" href="/">
          <span className="brandMark">F</span>
          <span>Founders Directory</span>
        </a>
        <a className="sourceLink" href="/">
          New card
        </a>
      </header>
      <FounderStudio initialHandle={handle} />
    </main>
  );
}
