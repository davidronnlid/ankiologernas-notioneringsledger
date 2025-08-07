import React from 'react';
import { Container, Box } from '@material-ui/core';
import Layout from '../components/Layout';
import PdfScreenshotViewer from '../components/PdfScreenshotViewer';

const PdfScreenshotsPage: React.FC = () => {
  return (
    <Layout
      title="PDF Screenshots - Ankiologernas Notioneringsledger"
      description="Generate high-quality screenshots from PDF pages"
      keywords="PDF, screenshots, pages, images, extract"
    >
      <Container maxWidth="lg">
        <Box paddingY={4}>
          <PdfScreenshotViewer />
        </Box>
      </Container>
    </Layout>
  );
};

export default PdfScreenshotsPage;
