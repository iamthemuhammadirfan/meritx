export const services = [
  {
    slug: "software-solutions",
    shortName: "Software",
    title: "Software that fits the way you work.",
    name: "Software & business systems",
    icon: "code",
    color: "blue",
    summary:
      "Custom applications, business websites and connected workflows that turn everyday complexity into a simpler way of working.",
    intro:
      "Your software should follow your business, not the other way around. We work with your team to understand the process, define the right solution and build software that people can actually use.",
    scope: [
      "Business websites & web applications",
      "Internal portals & management systems",
      "Workflow & process automation",
      "Dashboards, reporting & integrations",
    ],
    deliverables: [
      "An agreed feature scope and delivery plan",
      "Interfaces designed around your users",
      "Testing, deployment and a practical handover",
      "Clearly defined maintenance and support options",
    ],
    fit: "For teams replacing spreadsheets, improving an existing system or building a new digital service.",
    questions: [
      {
        q: "Can you work with our existing tools?",
        a: "We start by reviewing your current systems and the integrations they support. Where a connection is practical, we include it in the proposed scope rather than asking you to replace everything.",
      },
      {
        q: "How is a software project quoted?",
        a: "We define the users, workflows, features and integrations first. You receive a scope and commercial proposal, with any optional work separated so you can make an informed decision.",
      },
    ],
  },
  {
    slug: "it-equipment",
    shortName: "Equipment",
    title: "The right equipment. A considered investment.",
    name: "IT equipment & procurement",
    icon: "monitor",
    color: "peach",
    summary:
      "Laptops, desktops, servers and IT essentials, sourced against your specifications with clear pricing and deployment in mind.",
    intro:
      "A good purchase starts with the right specification. We help corporate teams, construction groups and public-sector buyers identify suitable IT equipment, compare options and plan delivery around the job it needs to do.",
    scope: [
      "Laptops, desktops & workstations",
      "Servers, storage & peripherals",
      "Network & surveillance equipment",
      "BOQ-based supply & tender quotations",
    ],
    deliverables: [
      "A clear specification and itemised quotation",
      "Suitable alternatives where requested",
      "Agreed delivery and installation scope",
      "Applicable manufacturer warranty information",
    ],
    fit: "For office rollouts, project-site mobilisation, equipment refreshes and tender-based procurement.",
    questions: [
      {
        q: "Can you quote against a tender or BOQ?",
        a: "Yes. Share the specification, quantities, required documents and submission deadline. We will review the requirements and identify any clarifications before preparing a quotation.",
      },
      {
        q: "Do you also install the equipment?",
        a: "Installation and configuration can be included in the proposal. We separate the supply and implementation scope so the responsibilities and costs are clear.",
      },
    ],
  },
  {
    slug: "networking-infrastructure",
    shortName: "Networks",
    title: "Connected spaces. Less friction.",
    name: "Networking & infrastructure",
    icon: "network",
    color: "mint",
    summary:
      "Structured cabling, switching, routing and Wi-Fi that connect your people, devices and business systems.",
    intro:
      "From an office network to a new project location, we plan connectivity around your layout, users and operational needs. The aim is a well-organised installation that is practical to use, maintain and expand.",
    scope: [
      "Structured cabling & network points",
      "Switches, routers & Wi-Fi deployment",
      "Rack organisation & equipment setup",
      "Network assessment & troubleshooting",
    ],
    deliverables: [
      "A site-informed layout and equipment plan",
      "Cable installation and device configuration",
      "Connectivity checks and labelled connections",
      "Configuration details and an agreed handover",
    ],
    fit: "For growing offices, commercial buildings, construction-site offices and relocated teams.",
    questions: [
      {
        q: "Is a site survey needed?",
        a: "A site assessment helps confirm cable routes, coverage, available power and equipment locations. We agree the assessment requirements before finalising the installation scope.",
      },
      {
        q: "Can you improve an existing network?",
        a: "Yes. We can review the current setup, identify likely bottlenecks and propose targeted changes instead of assuming a complete replacement is necessary.",
      },
    ],
  },
  {
    slug: "cctv-surveillance",
    shortName: "Security",
    title: "A clearer view of the places that matter.",
    name: "CCTV & surveillance",
    icon: "camera",
    color: "lavender",
    summary:
      "Camera systems planned for your premises, with installation, recording setup and a clear handover.",
    intro:
      "Effective surveillance starts with understanding a site. We consider entry points, working areas, lighting and recording needs to propose camera equipment and an installation layout suited to your premises.",
    scope: [
      "Camera selection & coverage planning",
      "Cabling, mounting & installation",
      "NVR/DVR & recording configuration",
      "Authorised remote viewing setup",
    ],
    deliverables: [
      "A proposed coverage layout and equipment list",
      "Installed and configured camera equipment",
      "Recording and viewing checks",
      "User guidance and access handover",
    ],
    fit: "For offices, warehouses, commercial premises and construction project locations.",
    questions: [
      {
        q: "Can we view cameras remotely?",
        a: "Where the selected equipment and internet connection support it, remote viewing can be configured for authorised users. Access arrangements and security settings are discussed during setup.",
      },
      {
        q: "How much recording storage do we need?",
        a: "Storage depends on camera count, resolution, recording schedule and the retention period you require. We include those factors when recommending the recorder and storage.",
      },
    ],
  },
  {
    slug: "installation-support",
    shortName: "Support",
    title: "From delivery to a working setup.",
    name: "Installation & technical support",
    icon: "settings",
    color: "sand",
    summary:
      "Equipment configuration, on-site implementation and practical technical support that help your investment get to work.",
    intro:
      "The project is not finished when a box arrives. We help bring equipment, software and infrastructure together, test the agreed scope and leave your team with a clear understanding of what has been installed.",
    scope: [
      "Office & project-site equipment rollouts",
      "Device configuration & system setup",
      "Troubleshooting & planned maintenance",
      "Technical handover & user guidance",
    ],
    deliverables: [
      "An agreed implementation schedule",
      "Installed and configured systems",
      "Checks against the agreed requirements",
      "A handover and clearly scoped support terms",
    ],
    fit: "For businesses that need help implementing new equipment or keeping an existing setup working effectively.",
    questions: [
      {
        q: "Do you provide ongoing support?",
        a: "Ongoing support can be agreed around your systems and needs. Coverage, response arrangements and exclusions are defined in the proposal rather than assumed.",
      },
      {
        q: "Can you work around our operations?",
        a: "We discuss access, working hours and potential disruption when planning the work. Where possible, installation is phased to fit the site's operating requirements.",
      },
    ],
  },
] as const;

export const processSteps = [
  {
    title: "Understand the requirement.",
    text: "Tell us what you need, share your BOQ, or walk us through the site. We clarify the scope before recommending a solution.",
    label: "Discover",
  },
  {
    title: "Put the right plan together.",
    text: "Get a considered specification, competitive quotation and clear responsibilities. Supply, installation and support are defined upfront.",
    label: "Plan & source",
  },
  {
    title: "Bring it all into place.",
    text: "We coordinate the agreed equipment, configuration and installation, with checks against the requirements before handover.",
    label: "Implement",
  },
  {
    title: "Keep the next step clear.",
    text: "Receive the relevant documentation, guidance and agreed support arrangements, so your team knows what comes next.",
    label: "Handover & support",
  },
];
