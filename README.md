<<<<<<< HEAD
# 인턴 식당 공유 보드

닉네임으로 로그인하고, 식당을 등록/수정하고, 별점과 비고를 여러 명이 남길 수 있는 Next.js + Supabase 프로젝트야.

## 1) 실행 방법

```bash
npm install
cp .env.example .env.local
npm run dev
```

브라우저에서 `http://localhost:3000` 열기.

## 2) Supabase 연결

1. Supabase에서 새 프로젝트 생성
2. SQL Editor에서 `supabase/schema.sql` 실행
3. Project Settings > API 에서 아래 2개 복사
   - Project URL
   - anon public key
4. `.env.local` 파일에 넣기

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## 3) 배포

Vercel에 GitHub 저장소 연결 후 배포하면 돼.
배포 환경변수에도 똑같이 아래 2개 넣어야 해.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 4) 현재 기능

- 닉네임 로그인(로컬 저장)
- 식당 직접 등록
- 기존 식당 수정
- 별점 0.5 단위
- 평균 별점 랭킹
- 웨이팅 / 거리 / 가격 / 추천 메뉴 표시
- 비고 여러 명 작성
- 비고 칸에서 닉네임 + 작성글 펼쳐보기

## 5) 참고

현재 닉네임은 간단한 로컬 로그인이라 비밀번호가 없어.
사내에서 가볍게 쓰는 용도로는 빠르지만, 나중에 더 제대로 운영하려면 Supabase Auth를 붙이는 게 좋아.
=======
# Yulchon-Intern
>>>>>>> c53c0054136cf8d245fda55a97ee4f4914f71bba
