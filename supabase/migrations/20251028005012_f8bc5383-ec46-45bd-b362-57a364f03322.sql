-- Add is_favorite column to faq table
ALTER TABLE public.faq 
ADD COLUMN is_favorite boolean NOT NULL DEFAULT false;

-- Add index for better performance when filtering favorites
CREATE INDEX idx_faq_booklet_favorite ON public.faq(booklet_id, is_favorite) WHERE is_favorite = true;

-- Add comment to explain the purpose
COMMENT ON COLUMN public.faq.is_favorite IS 'Indicates if the FAQ should be displayed publicly in the booklet. Non-favorite FAQs are only used by the chatbot.';