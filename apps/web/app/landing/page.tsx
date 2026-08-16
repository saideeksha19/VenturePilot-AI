import "./landing.css";

const capabilities = [
  ["CEO", "Keep the business focused on its highest-leverage next moves."],
  ["Research", "Turn questions about markets and customers into usable context."],
  ["Prospecting", "Create a structured path from ideal customer to qualified lead."],
  ["Sales", "Support consistent follow-through across every opportunity."],
  ["Marketing", "Shape clear campaigns and content from the business plan."],
  ["Analytics", "Connect the signals that help owners make better decisions."],
];

export default function LandingPage() {
  return (
    <main>
      <nav className="nav" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="VenturePilot AI home"><span>V</span> VenturePilot AI</a>
        <a className="nav-link" href="#platform">The platform</a>
      </nav>

      <section className="hero" id="top">
        <p className="eyebrow">Business operations, reimagined</p>
        <h1>Your business has ambition.<br /><em>Now it has a pilot.</em></h1>
        <p className="lede">VenturePilot AI is being built as the operating system that helps small businesses turn intent into coordinated action.</p>
        <div className="actions">
          <a className="button primary" href="#platform">Explore the platform <span aria-hidden>→</span></a>
          <a className="button secondary" href="#future">See what&apos;s ahead</a>
        </div>
        <div className="orbit" aria-hidden="true"><div className="orbit-core">VP</div><i /><b /></div>
      </section>

      <section className="platform" id="platform">
        <div className="section-heading">
          <p className="eyebrow">Built for the whole business</p>
          <h2>One clear operating rhythm.</h2>
          <p>Six focused capabilities will work together around the priorities that matter to a growing business.</p>
        </div>
        <div className="capability-grid">
          {capabilities.map(([name, description], index) => (
            <article className="capability" key={name}>
              <span className="number">0{index + 1}</span>
              <h3>{name}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="future" id="future">
        <p className="eyebrow">Phase 1 foundation</p>
        <h2>Designed to grow with you.</h2>
        <p>VenturePilot is starting with a dependable web and API foundation, ready for future AI, data, and workflow capabilities.</p>
      </section>

      <footer>© {new Date().getFullYear()} VenturePilot AI <span>Built for businesses in motion.</span></footer>
    </main>
  );
}
