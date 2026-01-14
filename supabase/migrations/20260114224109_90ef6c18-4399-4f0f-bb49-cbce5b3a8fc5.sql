CREATE OR REPLACE FUNCTION public.transfer_coins(
  p_from_profile uuid,
  p_to_profile uuid,
  p_amount integer
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_wallet      integer;
  v_to_wallet        integer;

  v_last_total       integer;
  v_last_hash        text;

  v_now              timestamptz;

  v_from_id_text     text;
  v_to_id_text       text;

  v_from_hash_text   text;
  v_to_hash_text     text;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive, got %', p_amount;
  END IF;

  IF p_from_profile = p_to_profile THEN
    RAISE EXCEPTION 'Sender and receiver must be different';
  END IF;

  -- 1. Берём кошелёк отправителя (FOR UPDATE для блокировки)
  SELECT wallet
  INTO v_from_wallet
  FROM public.profiles
  WHERE id = p_from_profile
  FOR UPDATE;

  IF v_from_wallet IS NULL THEN
    RAISE EXCEPTION 'Sender profile not found: %', p_from_profile;
  END IF;

  -- 2. Берём кошелёк получателя (FOR UPDATE)
  SELECT wallet
  INTO v_to_wallet
  FROM public.profiles
  WHERE id = p_to_profile
  FOR UPDATE;

  IF v_to_wallet IS NULL THEN
    RAISE EXCEPTION 'Receiver profile not found: %', p_to_profile;
  END IF;

  -- 3. Проверяем, что у отправителя хватает монет
  IF v_from_wallet < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance: have %, need %', v_from_wallet, p_amount;
  END IF;

  -- 4. Новый баланс отправителя и получателя
  v_from_wallet := v_from_wallet - p_amount;
  v_to_wallet   := v_to_wallet   + p_amount;

  -- 5. Получаем последнюю запись из coins
  SELECT c.total_balance, c.hash
  INTO v_last_total, v_last_hash
  FROM public.coins c
  ORDER BY c."when" DESC
  LIMIT 1;

  v_last_total := COALESCE(v_last_total, 0);
  v_last_hash  := COALESCE(v_last_hash, 'initial-secret-key');

  v_now := clock_timestamp();

  -- 7. Первая запись: ОТПРАВИТЕЛЬ
  v_from_id_text :=
      to_char(v_now, 'DD.MM.YYYY_HH24:MI:SS.MS') || '_' ||
      (-p_amount)::text || '_' ||
      v_from_wallet::text || '_' ||
      v_last_total::text || '_' ||
      p_from_profile::text;

  v_from_hash_text := encode(
      pgp_sym_encrypt(v_from_id_text, v_last_hash),
      'hex'
  );

  INSERT INTO public.coins (
    id_text,
    "when",
    amount,
    who,
    profile_balance,
    total_balance,
    hash
  ) VALUES (
    v_from_id_text,
    v_now,
    -p_amount,
    p_from_profile,
    v_from_wallet,
    v_last_total,
    v_from_hash_text
  );

  -- 8. Вторая запись: ПОЛУЧАТЕЛЬ
  v_to_id_text :=
      to_char(v_now, 'DD.MM.YYYY_HH24:MI:SS.MS') || '_' ||
      p_amount::text || '_' ||
      v_to_wallet::text || '_' ||
      v_last_total::text || '_' ||
      p_to_profile::text;

  v_to_hash_text := encode(
      pgp_sym_encrypt(v_to_id_text, v_from_hash_text),
      'hex'
  );

  INSERT INTO public.coins (
    id_text,
    "when",
    amount,
    who,
    profile_balance,
    total_balance,
    hash
  ) VALUES (
    v_to_id_text,
    v_now,
    p_amount,
    p_to_profile,
    v_to_wallet,
    v_last_total,
    v_to_hash_text
  );

  -- 9. Обновляем balances в profiles
  UPDATE public.profiles
  SET wallet = v_from_wallet,
      updated_at = now()
  WHERE id = p_from_profile;

  UPDATE public.profiles
  SET wallet = v_to_wallet,
      updated_at = now()
  WHERE id = p_to_profile;

  -- 10. Возвращаем hash первой записи (отправителя)
  RETURN v_from_hash_text;
END;
$$;