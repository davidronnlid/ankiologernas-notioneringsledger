import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import ClientPdfViewer from '../components/ClientPdfViewer';

const ClientPdfViewerPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>PDF Screenshot Generator - Client Side</title>
        <meta name="description" content="Generate high-quality screenshots from PDF pages using client-side rendering" />
      </Head>
      <ClientPdfViewer />
    </>
  );
};

export default ClientPdfViewerPage;
