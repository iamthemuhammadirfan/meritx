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
    heading: "Business software & workflow automation.",
    description:
      "Custom software development in Lahore: business web applications, internal portals, reporting and workflow automation. Discuss scope, integrations and deployment with MeritX.",
    image: "/images/connected-workspace.webp",
    alt: "Illustrative connected office environment for business software and infrastructure",
    planningTitle: "Workflow, users and integration requirements.",
    planningText:
      "We review the current process with your team: who enters information, who approves it and which reports are needed. The development scope identifies the screens, permissions, data and integrations to be delivered.",
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
    heading: "Business IT equipment supply.",
    description:
      "IT equipment supplier in Lahore for business laptops, desktops, workstations, servers and peripherals. Request a BOQ-based quotation with warranty and installation details.",
    image: "/images/business-laptop-fleet.webp",
    alt: "Illustrative business laptops, a workstation and docking equipment",
    planningTitle: "Models, configurations and warranty details.",
    planningText:
      "We quote against the required model or technical specification, quantities and delivery locations. Where alternatives are allowed, we list them separately with their configuration and warranty details.",
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
    heading: "Office networking & Wi-Fi installation.",
    description:
      "Office networking in Lahore: structured cabling, Wi-Fi installation, switches, routers and rack setup. Plan a new office network or review an existing setup with MeritX.",
    image: "/images/network-installation.webp",
    alt: "AI-generated concept of a technician organising structured cabling and network equipment",
    planningTitle: "Site layout, network points and coverage.",
    planningText:
      "We review floor plans, device counts, meeting rooms and the existing internet connection. The installation plan identifies cable routes, data points, switching capacity, Wi-Fi equipment and rack locations.",
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
    heading: "CCTV camera installation.",
    description:
      "CCTV camera installation in Lahore for offices, warehouses and project sites. Discuss camera coverage, NVR/DVR recording, storage, remote viewing and installation with MeritX.",
    image: "/images/network-installation.webp",
    alt: "Illustrative commercial premises with network equipment and a dome security camera",
    planningTitle: "Camera positions, lighting and recording.",
    planningText:
      "We identify the areas to cover, check lighting and mounting locations, and confirm the required recording period. These details determine the cameras, recorder, storage and cabling in the proposal.",
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
    heading: "IT installation & technical support.",
    description:
      "IT installation and technical support in Lahore: office device rollouts, configuration, network troubleshooting and handover. Agree a practical implementation and support scope with MeritX.",
    image: "/images/network-installation.webp",
    alt: "Illustrative technician configuring commercial network infrastructure",
    planningTitle: "Installation scope and acceptance checks.",
    planningText:
      "We list the devices, applications and connections to be configured, confirm account access and licensing, and agree the installation schedule. Acceptance checks are defined against those tasks.",
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
        text: "Troubleshooting, planned maintenance and ongoing technical assistance can be discussed against the systems you operate. Coverage, response arrangements and exclusions are stated in the proposal. The support proposal identifies the covered systems, contact route and maintenance tasks.",
      },
    ],
  },
};
