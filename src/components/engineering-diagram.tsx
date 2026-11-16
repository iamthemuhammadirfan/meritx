import { Boxes, Camera, CodeXml, Network } from "lucide-react";
import styles from "./engineering-pages.module.css";

export function EngineeringDiagram() {
  return (
    <div className={styles.diagram}>
      <p className={styles.diagramTitle}>Systems we design and integrate</p>
      <div className={styles.diagramNodes}>
        {[
          { Icon: CodeXml, label: "Software" },
          { Icon: Boxes, label: "IT equipment" },
          { Icon: Network, label: "Networks" },
          { Icon: Camera, label: "CCTV" },
        ].map(({ Icon, label }) => (
          <div className={styles.diagramNode} key={label}>
            <Icon aria-hidden="true" /> <span>{label}</span>
          </div>
        ))}
      </div>
      <div className={styles.diagramResult}>
        Installation, testing & handover
      </div>
    </div>
  );
}
