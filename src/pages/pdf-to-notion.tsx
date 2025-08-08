import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import ClientPdfViewer from '@/components/ClientPdfViewer';
import Layout from '@/components/Layout';

const PdfToNotionPage: NextPage = () => {
  return (
    <Layout>
      <Head>
        <title>Skapa Notionmall från PDF</title>
        <meta name="description" content="Ladda upp en PDF och generera Notion-block för sidorna" />
      </Head>
      <ClientPdfViewer />
    </Layout>
  );
};

export default PdfToNotionPage;


