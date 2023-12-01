import styles from "../styles/Footer.module.css";

export default function Footer() {
  return (
    <div className={styles.footerContainer}>
      <hr></hr>
      <p className={styles.footerText}>
        Ankiologernas Notioneringsledger är utvecklad i syfte att underlätta för
        Mattias Österdahl, Albin Lindberg och David Rönnlid att effektivt skapa
        amazing ankikort.
      </p>
    </div>
  );
}
