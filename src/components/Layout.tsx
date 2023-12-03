import Head from "next/head";

import { Box, Container } from "@material-ui/core";

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
        <link rel="icon" href="/images/logo.png" />
      </Head>
      <Header />
      <Box my={5}>
        <Container maxWidth="lg">{children}</Container>
      </Box>
      <Footer />
    </div>
  );
}
