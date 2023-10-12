import Head from "next/head";
import { useRouter } from "next/router";

import { Container } from "@material-ui/core";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

import { LayoutProps } from "@/types";

export default function Layout({
  title = "Ankiologernas Notioneringsledger",
  description = "Ankiologernas Notioneringsledger",
  keywords = "Ankiologernas Notioneringsledger",
  children,
}: LayoutProps) {
  return (
    <div>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />
      </Head>
      <Header />
      <Container maxWidth="lg">{children}</Container>
      <Footer />
    </div>
  );
}
