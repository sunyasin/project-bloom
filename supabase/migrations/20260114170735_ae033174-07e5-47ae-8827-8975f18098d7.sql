-- Allow moderators to view all businesses (for moderation)
CREATE POLICY "Moderators can view all businesses" 
ON public.businesses 
FOR SELECT 
TO authenticated
USING (
  public.has_role(auth.uid(), 'moderator') OR 
  public.has_role(auth.uid(), 'super_admin')
);

-- Allow moderators to update business status
CREATE POLICY "Moderators can update businesses" 
ON public.businesses 
FOR UPDATE 
TO authenticated
USING (
  public.has_role(auth.uid(), 'moderator') OR 
  public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'moderator') OR 
  public.has_role(auth.uid(), 'super_admin')
);

-- Allow news editors to view all news
CREATE POLICY "News editors can view all news" 
ON public.news 
FOR SELECT 
TO authenticated
USING (
  public.has_role(auth.uid(), 'news_editor') OR 
  public.has_role(auth.uid(), 'super_admin')
);

-- Allow news editors to insert news
CREATE POLICY "News editors can insert news" 
ON public.news 
FOR INSERT 
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'news_editor') OR 
  public.has_role(auth.uid(), 'super_admin')
);

-- Allow news editors to update any news
CREATE POLICY "News editors can update all news" 
ON public.news 
FOR UPDATE 
TO authenticated
USING (
  public.has_role(auth.uid(), 'news_editor') OR 
  public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'news_editor') OR 
  public.has_role(auth.uid(), 'super_admin')
);

-- Allow news editors to delete any news
CREATE POLICY "News editors can delete all news" 
ON public.news 
FOR DELETE 
TO authenticated
USING (
  public.has_role(auth.uid(), 'news_editor') OR 
  public.has_role(auth.uid(), 'super_admin')
);