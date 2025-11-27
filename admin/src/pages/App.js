import React, { useState } from 'react';
import { BaseHeaderLayout, ContentLayout } from '@strapi/design-system/Layout';
import { Button } from '@strapi/design-system/Button';
import { useNotification } from '@strapi/helper-plugin';
import pluginId from '../pluginId';
import {axiosInstance} from "strapi-plugin-responsive-image/admin/src/utils";
import axios from "axios";

const App = () => {
  const [loading, setLoading] = useState(false);
  const toggleNotification = useNotification();

  const handleMigrate = async () => {
    setLoading(true);

    try {
      const response = await axiosInstance.post(`/${pluginId}/migrate-images`);

      toggleNotification({ type: 'success', message: response.data.message });
    } catch (error) {
      toggleNotification({
        type: 'warning',
        message: `Migration error: ${
          error.response?.data?.error?.message || error.message
        }`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDomainChanger = async () => {
    setLoading(true);

    try {
      const response = await axiosInstance.post(`/${pluginId}/change-domain`);

      toggleNotification({ type: 'success', message: response.data.message });
    } catch (error) {
      toggleNotification({
        type: 'warning',
        message: `Domain changer error: ${
          error.response?.data?.error?.message || error.message
        }`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReuploadImages = async () => {
    setLoading(true);

    try {
      const response = await axiosInstance.post(`/${pluginId}/reupload-images`);

      toggleNotification({ type: 'success', message: response.data.message });
    } catch (error) {
      toggleNotification({
        type: 'warning',
        message: `Reupload error: ${
          error.response?.data?.error?.message || error.message
        }`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <BaseHeaderLayout
        title="Media migration R2"
        subtitle="Migrate all media to Cloudflare R2"
      />
      <ContentLayout>
        <Button onClick={handleMigrate} loading={loading}>
          Run all media migration
        </Button>

        <Button onClick={handleDomainChanger} loading={loading} style={{ marginTop: '16px' }}>
          Run all media domain changer
        </Button>

        <Button onClick={handleReuploadImages} loading={loading} style={{ marginTop: '16px' }}>
          Reupload all images
        </Button>
      </ContentLayout>
    </>
  );
};

export default App;
