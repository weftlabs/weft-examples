import { EventExtractor } from "./event-extractor";

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
          href="https://github.com/weft-labs/weft-examples/tree/main/apps/luma-event-enrichment"
        >
          View source
        </a>
      </header>

      <section className="workspace">
        <div className="intro">
          <h1>Turn an event page into data your app can use.</h1>
          <p>
            Paste a public Luma URL. This server calls one paid extraction
            capability through Weft, then returns the event and its receipt. No
            Diffbot account or provider key is required.
          </p>
        </div>
        <EventExtractor />
      </section>
    </main>
  );
}
