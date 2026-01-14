-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create coin_exchange function
CREATE OR REPLACE FUNCTION public.coin_exchange(
  IN p_initiator uuid,      -- profiles.user_id
  IN is_r2c boolean,        -- true = rub-coin, false = coin-rub
  IN p_sum integer          -- сумма операции (всегда положительная)
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id       uuid;
  v_old_wallet       integer;
  v_new_wallet       integer;
  v_last_total       integer;
  v_last_hash        text;
  v_effective_sum    integer;
  v_now              timestamptz;
  v_id_text          text;
  v_hash_text        text;
BEGIN
  -- 1. Находим профиль
  SELECT id, wallet
  INTO v_profile_id, v_old_wallet
  FROM public.profiles
  WHERE user_id = p_initiator
  FOR UPDATE;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user_id=%', p_initiator;
  END IF;

  -- 2. Знак суммы
  IF is_r2c THEN
    v_effective_sum := p_sum;
  ELSE
    v_effective_sum := -p_sum;
  END IF;

  -- 3. Новый баланс пользователя
  v_new_wallet := v_old_wallet + v_effective_sum;
  IF v_new_wallet < 0 THEN
    RAISE EXCEPTION 'Insufficient coins: old=%, delta=%', v_old_wallet, v_effective_sum;
  END IF;

  -- 4. Последняя запись coins
  SELECT c.total_balance, c.hash
  INTO v_last_total, v_last_hash
  FROM public.coins c
  ORDER BY c."when" DESC
  LIMIT 1;

  v_last_total := COALESCE(v_last_total, 0);
  v_last_hash := COALESCE(v_last_hash, 'initial-secret-key');

  -- 5. Новый total_balance
  v_last_total := v_last_total + v_effective_sum;

  -- 6. НОВЫЙ формат id_text: ДАТА_СУММА_userbalance_totalbalance_WHOID
  v_now := clock_timestamp();
  v_id_text :=
      to_char(v_now, 'DD.MM.YYYY_HH24:MI:SS.MS') || '_' ||
      v_effective_sum::text || '_' ||
      v_new_wallet::text || '_' ||
      v_last_total::text || '_' ||
      p_initiator::text;

  -- 7. Шифрование
  v_hash_text := encode(pgp_sym_encrypt(v_id_text, v_last_hash), 'hex');

  -- 8. Обновляем профиль
  UPDATE public.profiles SET wallet = v_new_wallet WHERE id = v_profile_id;

  -- 9. Запись в coins
  INSERT INTO public.coins (id_text, "when", amount, who, profile_balance, total_balance, hash)
  VALUES (v_id_text, v_now, v_effective_sum, v_profile_id, v_new_wallet, v_last_total, v_hash_text);

  RETURN v_hash_text;
END;
$$;