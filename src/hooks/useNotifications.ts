import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { Database } from '../types/database.types'

type Notification = Database['public']['Tables']['notifications']['Row']
type Stock = Database['public']['Tables']['stock']['Row']

export function useNotifications() {
  const { user } = useAuthStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      // Check for low stock items and create notifications if needed
      await checkAndCreateLowStockNotifications()

      // Get notifications after potentially creating new ones
      const { data: notifications, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (notifError) {
        console.error('Error fetching notifications:', notifError)
      } else {
        const typedNotifications = notifications as Notification[]
        setNotifications(typedNotifications || [])
        setUnreadCount(typedNotifications?.filter(n => !n.is_read).length || 0)
      }
    } catch (error) {
      console.error('Error in fetchNotifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkAndCreateLowStockNotifications = async () => {
    if (!user?.factory_id) return

    try {
      // Check factory stock for low levels
      const { data: lowStockItems, error } = await supabase
        .from('stock')
        .select('*')
        .eq('factory_id', user.factory_id)
        .lt('quantity', 10) // Items with less than 10 units
        .gt('quantity', 0) // Exclude out of stock items

      if (error) {
        console.error('Error checking low stock:', error)
        return
      }

      if (lowStockItems && lowStockItems.length > 0) {
        const typedLowStockItems = lowStockItems as Stock[]
        
        // Check if we already have recent notifications for these items
        const itemIds = typedLowStockItems.map(item => item.id)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        
        const { data: recentNotifications } = await supabase
          .from('notifications')
          .select('reference_id')
          .eq('user_id', user.id)
          .eq('type', 'warning')
          .eq('reference_type', 'low_stock')
          .gt('created_at', oneDayAgo)
          .in('reference_id', itemIds)

        const typedRecentNotifications = recentNotifications as { reference_id: string | null }[]
        const recentlyNotifiedIds = typedRecentNotifications?.map(n => n.reference_id).filter(Boolean) || []

        // Create notifications for items not recently notified
        const newNotifications = typedLowStockItems
          .filter(item => !recentlyNotifiedIds.includes(item.id))
          .map(item => ({
            user_id: user.id,
            title: 'Low Stock Alert',
            message: `${item.item_name} is running low (${item.quantity} ${item.unit} remaining)`,
            type: 'warning' as const,
            reference_id: item.id,
            reference_type: 'low_stock'
          }))

        if (newNotifications.length > 0) {
          const { error: insertError } = await supabase
            .from('notifications')
            .insert(newNotifications as any)

          if (insertError) {
            console.error('Error creating low stock notifications:', insertError)
          }
        }
      }
    } catch (error) {
      console.error('Error in checkAndCreateLowStockNotifications:', error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId)

      if (error) {
        console.error('Error marking notification as read:', error)
        return
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error in markAsRead:', error)
    }
  }

  const markAllAsRead = async () => {
    if (!user?.id) return

    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) {
        console.error('Error marking all notifications as read:', error)
        return
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ 
          ...n, 
          is_read: true, 
          read_at: new Date().toISOString() 
        }))
      )
      setUnreadCount(0)
    } catch (error) {
      console.error('Error in markAllAsRead:', error)
    }
  }

  useEffect(() => {
    fetchNotifications()

    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`
        },
        () => {
          fetchNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, user?.factory_id])

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications
  }
}