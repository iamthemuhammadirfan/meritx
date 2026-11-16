export type ServiceContent = {
  seoTitle: string;
  heading: string;
  description: string;
  image: string;
  alt: string;
  planningTitle: string;
  planningText: string;
  checks: string[];
  sections: { title: string; text: string }[];
};
export const serviceContent: Record<string, ServiceContent> = {
  "software-solutions": {
    seoTitle: "Custom Software Development in Lahore",
    heading: "Software built around your business.",
    description:
      "Custom software development in Lahore: business web applications, internal portals, reporting and workflow automation. Discuss scope, integrations and deployment with MeritX.",
    image: "/images/connected-workspace.webp",
    alt: "Illustrative connected office environment for business software and infrastructure",
    planningTitle: "Define the workflow before the feature list.",
    planningText:
      "A useful software brief describes the people doing the work, the information they use and where the current process slows them down. We turn those requirements into a defined scope before discussing implementation.",
    checks: [
      "User roles, approvals and access requirements",
      "Existing systems and available integration options",
      "Reporting, data entry and information ownership",
      "Hosting, licensing, backups and ongoing maintenance",
    ],
    sections: [
      {
        title: "From a manual process to a usable system.",
        text: "Your requirement might be a customer portal, an internal job-management tool, a business website or a reporting dashboard. We review the workflow, the people using it and the information that needs to move between systems. The proposal defines what is included, how progress is reviewed and what will be checked before launch.",
      },
      {
        title: "Plan for the system after launch.",
        text: "Support, hosting, access administration and future changes should be part of the conversation early. We clarify responsibility for these items and any migration or training work in the agreed scope. A project in Lahore can combine software delivery with equipment and network requirements where your team needs a complete setup.",
      },
    ],
  },
  "it-equipment": {
    seoTitle: "IT Equipment Supplier in Lahore",
    heading: "IT equipment for the way you work.",
    description:
      "IT equipment supplier in Lahore for business laptops, desktops, workstations, servers and peripherals. Request a BOQ-based quotation with warranty and installation details.",
    image: "/images/business-laptop-fleet.webp",
    alt: "Illustrative business laptops, a workstation and docking equipment",
    planningTitle: "Compare the specification, not just the price.",
    planningText:
      "A useful equipment quotation identifies the exact configuration, quantities and delivery scope. We help corporate buyers, construction groups and public-sector teams review those details before committing to a supply.",
    checks: [
      "Exact model and configuration against the requirement",
      "Quantities, location and phased delivery needs",
      "Warranty provider, coverage and claim process",
      "Accessories, software licensing and installation scope",
    ],
    sections: [
      {
        title: "Office equipment and project-site supply.",
        text: "MeritX can review requirements for laptops, desktops, workstations, servers, storage, monitors and peripherals. Tell us who will use the equipment and which applications or technical specifications it must support. For a new office or a site mobilisation, networking and device setup can be considered alongside the equipment list.",
      },
      {
        title: "Tender and BOQ requirements.",
        text: "Share the BOQ, submission deadline and any required compliance documents. Where alternatives are permitted, we identify them separately so the comparison stays clear. Current availability, price, applicable taxes, delivery and warranty are confirmed in the quotation; the website is a guide to our supply services rather than a live stock catalogue.",
      },
    ],
  },
  "networking-infrastructure": {
    seoTitle: "Office Networking & Wi-Fi Installation in Lahore",
    heading: "A network planned for your workplace.",
    description:
      "Office networking in Lahore: structured cabling, Wi-Fi installation, switches, routers and rack setup. Plan a new office network or review an existing setup with MeritX.",
    image: "/images/network-installation.webp",
    alt: "AI-generated concept of a technician organising structured cabling and network equipment",
    planningTitle: "Start with the building and the users.",
    planningText:
      "The number of connected devices is only part of the brief. Floor layouts, working areas, meeting rooms, internet services and future expansion all affect how a network should be planned.",
    checks: [
      "Floor layout, cable routes and required network points",
      "Staff devices, meeting spaces and Wi-Fi coverage needs",
      "Existing switches, routers and internet connections",
      "Rack location, power, access and documentation",
    ],
    sections: [
      {
        title: "New offices, relocated teams and project sites.",
        text: "For a new location, we can scope structured cabling, network points, switches, routing and Wi-Fi equipment as one installation. The proposal identifies the work, materials and configuration responsibilities. Site access, building restrictions and the operating schedule are discussed before implementation.",
      },
      {
        title: "Improve an existing setup with a clear plan.",
        text: "If the issue is intermittent connectivity, coverage gaps or a difficult-to-manage rack, an assessment can help separate the symptoms from the changes actually needed. We review the current arrangement and propose targeted improvements. Agreed checks, cable identification, configuration information and handover requirements are included in the scope.",
      },
    ],
  },
  "cctv-surveillance": {
    seoTitle: "CCTV Camera Installation in Lahore",
    heading: "CCTV planned around your premises.",
    description:
      "CCTV camera installation in Lahore for offices, warehouses and project sites. Discuss camera coverage, NVR/DVR recording, storage, remote viewing and installation with MeritX.",
    image: "/images/network-installation.webp",
    alt: "Illustrative commercial premises with network equipment and a dome security camera",
    planningTitle: "Decide what you need to see.",
    planningText:
      "Coverage starts with the areas that matter: entrances, working spaces, storage locations and the movement around a site. Lighting, mounting positions and recording expectations should guide equipment selection.",
    checks: [
      "Required viewing areas, camera positions and lighting",
      "Recorder type, camera count and storage expectations",
      "Cabling routes, power and network availability",
      "Authorised access, viewing devices and handover",
    ],
    sections: [
      {
        title: "A coordinated camera and recording setup.",
        text: "MeritX can review camera selection, mounting, cabling, recording equipment and viewing configuration together. The proposal should state the coverage assumptions and the equipment being supplied. Existing equipment can be reviewed where compatibility and condition make reuse practical.",
      },
      {
        title: "Clear access arrangements after installation.",
        text: "Recording checks, viewing access and user guidance are agreed as part of the handover. Remote viewing depends on the selected equipment and the site's connectivity. We discuss authorised users and access responsibilities, rather than treating an internet-connected camera as a complete security plan. Any ongoing maintenance is scoped separately.",
      },
    ],
  },
  "installation-support": {
    seoTitle: "IT Installation & Technical Support in Lahore",
    heading: "Equipment delivered. Systems working.",
    description:
      "IT installation and technical support in Lahore: office device rollouts, configuration, network troubleshooting and handover. Agree a practical implementation and support scope with MeritX.",
    image: "/images/network-installation.webp",
    alt: "Illustrative technician configuring commercial network infrastructure",
    planningTitle: "Agree what a working setup means.",
    planningText:
      "Installation is easier to assess when the required result is defined. We discuss which devices, applications and connections need to work, who is responsible for access and what will be checked before handover.",
    checks: [
      "Equipment list, software and configuration requirements",
      "Site access, installation schedule and disruption limits",
      "Accounts, licences and backup responsibilities",
      "Acceptance checks, documentation and support terms",
    ],
    sections: [
      {
        title: "Rollouts for offices and active project locations.",
        text: "We can coordinate device setup, network connections, peripherals and other agreed implementation work around a business requirement. A new equipment purchase can include installation in the same proposal, or an existing environment can be reviewed for a defined technical task.",
      },
      {
        title: "Support with responsibilities made clear.",
        text: "Troubleshooting, planned maintenance and ongoing technical assistance can be discussed against the systems you operate. Coverage, response arrangements and exclusions are stated in the proposal. We do not assume a round-the-clock service or an unlimited support commitment where these have not been agreed.",
      },
    ],
  },
};
