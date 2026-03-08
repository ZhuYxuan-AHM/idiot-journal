-- 004_notifications.sql

-- 1. 创建通知表
CREATE TABLE public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('status', 'featured', 'announcement')),
  title_en text not null,
  title_zh text not null,
  message_en text not null,
  message_zh text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications" ON public.notifications 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications" ON public.notifications 
  FOR UPDATE USING (auth.uid() = user_id);

-- 2. 触发器：自动监听稿件状态变化并通知作者
CREATE OR REPLACE FUNCTION public.notify_submission_status()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status != 'draft' THEN
    INSERT INTO public.notifications (user_id, type, title_en, title_zh, message_en, message_zh)
    VALUES (
      NEW.user_id, 'status',
      'Submission Status Updated', '稿件状态已更新',
      'Your submission "' || NEW.title || '" is now ' || NEW.status || '.',
      '您的稿件《' || NEW.title || '》状态已更新为：' || NEW.status
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_submission_status_change
  AFTER UPDATE OF status ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_submission_status();

-- 3. 全站广播函数：主编发公告用
CREATE OR REPLACE FUNCTION public.broadcast_announcement(t_en text, t_zh text, m_en text, m_zh text)
RETURNS void AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title_en, title_zh, message_en, message_zh)
  SELECT id, 'announcement', t_en, t_zh, m_en, m_zh FROM public.profiles;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 封面文章设置函数：同时向所有人推送通知
CREATE OR REPLACE FUNCTION public.set_featured_article(target_article_id uuid)
RETURNS void AS $$
DECLARE
  v_title text;
BEGIN
  -- 获取文章标题用于通知
  SELECT title_zh INTO v_title FROM public.articles WHERE id = target_article_id;

  -- 重置所有封面
  UPDATE public.articles SET featured = false WHERE featured = true;
  -- 设为新封面
  UPDATE public.articles SET featured = true WHERE id = target_article_id;

  -- 广播新封面通知
  INSERT INTO public.notifications (user_id, type, title_en, title_zh, message_en, message_zh)
  SELECT id, 'featured',
         'New Featured Article', '新封面文章发布',
         'A new featured article has been selected. Check it out on the homepage!',
         '最新一期封面文章已发布：《' || v_title || '》，快去看看吧！'
  FROM public.profiles;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
