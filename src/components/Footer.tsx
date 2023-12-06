import { Box } from "@material-ui/core";
import styles from "../styles/Footer.module.css";
import Image from "next/image";

export default function Footer() {
  return (
    <div className={styles.footerContainer}>
      <span className={styles.footerText}>
        Ankiologernas Notioneringsledger är utvecklad i syfte att underlätta för{" "}
        <Image
          src={"/images/mattias.png"}
          alt="Mattias Österdahl"
          width={40}
          height={40}
          layout="fixed"
        />
        ,{" "}
        <Image
          src={"/images/albin.png"}
          alt="Albin Lindberg"
          width={40}
          height={40}
          layout="fixed"
        />{" "}
        och{" "}
        <Image
          src={"/images/david.png"}
          alt="David Rönnlid"
          width={40}
          height={40}
          layout="fixed"
        />{" "}
        att effektivt skapa amazing ankikort.
      </span>
    </div>
  );
}
