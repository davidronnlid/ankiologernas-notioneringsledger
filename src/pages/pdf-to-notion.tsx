import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import ClientPdfViewer from '@/components/ClientPdfViewer';

const PdfToNotionPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Skapa Notionmall från PDF</title>
        <meta name="description" content="Ladda upp en PDF och generera Notion-block för sidorna" />
      </Head>
      <ClientPdfViewer />
    </>
  );
};

export default PdfToNotionPage;


