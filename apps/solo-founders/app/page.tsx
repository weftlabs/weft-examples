import { FounderStudio } from "./founder-studio";

export default function Home() {
  return (
    <main>
      <header className="masthead">
        <a className="brand" href="https://weftlabs.com">
          <span className="brandMark">W</span>
          <span>Weft Examples</span>
        </a>
        <a
          className="sourceLink"
          href="https://github.com/weftlabs/weft-examples/tree/main/apps/solo-founders"
        >
          View source
        </a>
      </header>
      <FounderStudio />
    </main>
  );
}
