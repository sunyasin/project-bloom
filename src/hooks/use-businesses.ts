import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Business, BusinessStatus } from '@/types/db';

export interface BusinessInsert {
  name: string;
  category?: string;
  category_id?: string;
  location?: string;
  city?: string;
  content_json?: Record<string, unknown>;
}

export function useBusinesses() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Загрузка визиток текущего пользователя
  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setBusinesses([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .neq('status', 'deleted')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      // Map to Business type with proper status handling
      const mapped: Business[] = (data || []).map(item => ({
        ...item,
        status: item.status as BusinessStatus,
        content_json: (item.content_json || {}) as Record<string, unknown>,
        donation_30d: Number(item.donation_30d) || 0,
      }));
      
      setBusinesses(mapped);
    } catch (error) {
      console.error('Error fetching businesses:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить визитки',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Создание новой визитки
  const createBusiness = useCallback(async (data: BusinessInsert): Promise<Business | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Ошибка',
          description: 'Необходимо авторизоваться',
          variant: 'destructive',
        });
        return null;
      }

      const insertData = {
        owner_id: user.id,
        name: data.name,
        category: data.category || '',
        category_id: data.category_id || null,
        location: data.location || '',
        city: data.city || '',
        content_json: JSON.parse(JSON.stringify(data.content_json || {})),
        status: 'draft' as const,
      };

      const { data: newBusiness, error } = await supabase
        .from('businesses')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      const mapped: Business = {
        ...newBusiness,
        status: newBusiness.status as BusinessStatus,
        content_json: (newBusiness.content_json || {}) as Record<string, unknown>,
        donation_30d: Number(newBusiness.donation_30d) || 0,
      };

      setBusinesses(prev => [mapped, ...prev]);
      toast({
        title: 'Успешно',
        description: 'Визитка создана',
      });
      return mapped;
    } catch (error) {
      console.error('Error creating business:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать визитку',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  // Обновление статуса визитки
  const updateBusinessStatus = useCallback(async (id: string, status: BusinessStatus): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      if (status === 'deleted') {
        setBusinesses(prev => prev.filter(b => b.id !== id));
      } else {
        setBusinesses(prev => prev.map(b => b.id === id ? { ...b, status } : b));
      }

      toast({
        title: 'Успешно',
        description: status === 'deleted' ? 'Визитка удалена' : 'Статус обновлён',
      });
      return true;
    } catch (error) {
      console.error('Error updating business status:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить статус',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  // Скрыть визитку (status = 'draft')
  const hideBusiness = useCallback((id: string) => {
    return updateBusinessStatus(id, 'draft');
  }, [updateBusinessStatus]);

  // Удалить визитку (soft delete: status = 'deleted')
  const deleteBusiness = useCallback((id: string) => {
    return updateBusinessStatus(id, 'deleted');
  }, [updateBusinessStatus]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  return {
    businesses,
    loading,
    fetchBusinesses,
    createBusiness,
    updateBusinessStatus,
    hideBusiness,
    deleteBusiness,
  };
}
