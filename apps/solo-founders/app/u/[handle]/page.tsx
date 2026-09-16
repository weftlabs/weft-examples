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
          <span className="brandMark">W</span>
          <span>Solo founders</span>
        </a>
        <a className="sourceLink" href="/">
          New card
        </a>
      </header>
      <FounderStudio initialHandle={handle} />
    </main>
  );
}
