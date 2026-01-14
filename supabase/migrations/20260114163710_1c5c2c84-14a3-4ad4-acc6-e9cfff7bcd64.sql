CREATE OR REPLACE FUNCTION public.decode_coin_hash(
  IN p_hash_text text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_when      timestamptz;
  v_last_hash        text;
  v_encrypted        bytea;
  v_decrypted        text;
BEGIN
  -- 1. Находим время записи с данным hash
  SELECT "when" INTO v_target_when
  FROM public.coins 
  WHERE hash = p_hash_text;

  IF v_target_when IS NULL THEN
    RAISE EXCEPTION 'Hash record not found: %', p_hash_text;
  END IF;

  -- 2. Ключ = hash предыдущей записи (по времени)
  SELECT c.hash INTO v_last_hash
  FROM public.coins c
  WHERE c."when" < v_target_when
  ORDER BY c."when" DESC
  LIMIT 1;

  IF v_last_hash IS NULL THEN
    v_last_hash := 'initial-secret-key';
  END IF;

  -- 3. Декодируем hex → bytea → расшифровываем
  v_encrypted := decode(p_hash_text, 'hex');
  v_decrypted := pgp_sym_decrypt(v_encrypted, v_last_hash);

  RETURN v_decrypted;
END;
$$;