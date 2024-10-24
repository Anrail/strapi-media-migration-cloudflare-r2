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
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();
    try {

      const response = await axiosInstance.post(`/${pluginId}/migrate-images`, {
        cancelToken: source.token,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response;

      if (!response.ok) {
        throw new Error(data.error || 'Помилка запиту');
      }

      toggleNotification({ type: 'success', message: data.message });
    } catch (error) {
      toggleNotification({ type: 'warning', message: `Помилка міграції: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <BaseHeaderLayout
        title="Міграція зображень"
        subtitle="Завантажте всі зображення на Cloudflare R2"
      />
      <ContentLayout>
        <Button onClick={handleMigrate} loading={loading}>
          Запустити міграцію зображень
        </Button>
      </ContentLayout>
    </>
  );
};

export default App;
