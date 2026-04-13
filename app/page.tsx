'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import StarRating from '@/components/StarRating';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { mergeRestaurants } from '@/lib/utils';
import {
  DistanceLevel,
  Note,
  PriceLevel,
  Restaurant,
  RestaurantWithNotes,
} from '@/lib/types';

type RestaurantForm = {
  name: string;
  category: string;
  distance: DistanceLevel;
  price: PriceLevel;
  waiting: boolean;
  recommended_menu: string;
};

type NoteForm = {
  rating: number;
  text: string;
};

const initialRestaurantForm: RestaurantForm = {
  name: '',
  category: '한식',
  distance: '적당',
  price: '적당',
  waiting: false,
  recommended_menu: '',
};

const initialNoteForm: NoteForm = {
  rating: 4.5,
  text: '',
};

export default function HomePage() {
  const [nicknameInput, setNicknameInput] = useState('');
  const [nickname, setNickname] = useState('');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);
  const [restaurantForm, setRestaurantForm] =
    useState<RestaurantForm>(initialRestaurantForm);
  const [noteForm, setNoteForm] = useState<NoteForm>(initialNoteForm);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [distanceFilter, setDistanceFilter] =
    useState<'전체' | DistanceLevel>('전체');
  const [priceFilter, setPriceFilter] =
    useState<'전체' | PriceLevel>('전체');
  const [waitingFilter, setWaitingFilter] = useState<
    '전체' | '웨이팅 있음' | '웨이팅 없음'
  >('전체');
  const [errorMessage, setErrorMessage] = useState('');
  const [openNoteRestaurantId, setOpenNoteRestaurantId] = useState<number | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editNoteForm, setEditNoteForm] = useState<NoteForm>(initialNoteForm);

  useEffect(() => {
    const savedNickname = window.localStorage.getItem('lunch_nickname') ?? '';
    setNickname(savedNickname);
    setNicknameInput(savedNickname);
  }, []);

  useEffect(() => {
    void fetchData();
  }, []);

  function canEditNote(note: Note) {
  return (
    !!nickname.trim() &&
    (isAdmin ||
      note.nickname.trim().toLowerCase() === nickname.trim().toLowerCase())
  );
}

  function beginEditNote(note: Note) {
    if (!canEditNote(note)) {
      alert('본인이 작성한 후기만 수정할 수 있어요.');
      return;
    }

    setEditingNoteId(note.id);
    setEditNoteForm({
      rating: note.rating,
      text: note.text,
    });
  }

    async function handleSaveNoteEdit(noteId: number) {
    if (!supabase) return;

    const targetNote = notes.find((note) => note.id === noteId);
    if (!targetNote) return;

    if (!canEditNote(targetNote)) {
      alert('본인이 작성한 후기만 수정할 수 있어요.');
      return;
    }

    if (!editNoteForm.text.trim()) {
      alert('후기 내용을 입력!');
      return;
    }

    setSaving(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase
        .from('notes')
        .update({
          rating: editNoteForm.rating,
          text: editNoteForm.text.trim(),
        })
        .eq('id', noteId)
        .select()
        .single();

      if (error) {
        setErrorMessage(error.message);
        alert(`후기 수정 실패: ${error.message}`);
        return;
      }

      if (data) {
        const updatedNote = data as Note;
        setNotes((prev) =>
          prev.map((note) => (note.id === updatedNote.id ? updatedNote : note))
        );
        setEditingNoteId(null);
        setEditNoteForm(initialNoteForm);
      }
    } finally {
      setSaving(false);
    }
  }

  async function fetchData() {
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const [restaurantResult, noteResult] = await Promise.all([
        supabase
          .from('restaurants')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('notes')
          .select('*')
          .order('created_at', { ascending: false }),
      ]);

      if (restaurantResult.error) {
        setErrorMessage(restaurantResult.error.message);
        return;
      }

      if (noteResult.error) {
        setErrorMessage(noteResult.error.message);
        return;
      }

      const nextRestaurants = (restaurantResult.data ?? []) as Restaurant[];
      const nextNotes = (noteResult.data ?? []) as Note[];

      setRestaurants(nextRestaurants);
      setNotes(nextNotes);

      setSelectedRestaurantId((prev) => {
        if (prev !== null && nextRestaurants.some((restaurant) => restaurant.id === prev)) {
          return prev;
        }
        return nextRestaurants[0]?.id ?? null;
      });

      setOpenNoteRestaurantId((prev) => {
        if (prev !== null && nextRestaurants.some((restaurant) => restaurant.id === prev)) {
          return prev;
        }
        return null;
      });
    } finally {
      setLoading(false);
    }
  }

  const mergedRestaurants = useMemo(
    () => mergeRestaurants(restaurants, notes),
    [restaurants, notes]
  );

  const visibleRestaurants = useMemo(() => {
    const q = search.trim().toLowerCase();

    const filtered = mergedRestaurants.filter((restaurant) => {
      const matchesSearch =
        !q ||
        restaurant.name.toLowerCase().includes(q) ||
        restaurant.category.toLowerCase().includes(q) ||
        (restaurant.recommended_menu ?? '').toLowerCase().includes(q);

      const matchesDistance =
        distanceFilter === '전체' || restaurant.distance === distanceFilter;

      const matchesPrice =
        priceFilter === '전체' || restaurant.price === priceFilter;

      const matchesWaiting =
        waitingFilter === '전체' ||
        (waitingFilter === '웨이팅 있음' && restaurant.waiting) ||
        (waitingFilter === '웨이팅 없음' && !restaurant.waiting);

      return matchesSearch && matchesDistance && matchesPrice && matchesWaiting;
    });

    const distanceOrder: Record<DistanceLevel, number> = {
      가깝다: 0,
      적당: 1,
      멀다: 2,
    };

    const priceOrder: Record<PriceLevel, number> = {
      싸다: 0,
      적당: 1,
      비싸다: 2,
    };

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'rating') {
        const ratingDiff = b.avgRating - a.avgRating;
        if (ratingDiff !== 0) return ratingDiff;

        const noteCountDiff = b.notes.length - a.notes.length;
        if (noteCountDiff !== 0) return noteCountDiff;

        return a.name.localeCompare(b.name, 'ko');
      }

      if (sortBy === 'reviews') {
        const noteCountDiff = b.notes.length - a.notes.length;
        if (noteCountDiff !== 0) return noteCountDiff;

        const ratingDiff = b.avgRating - a.avgRating;
        if (ratingDiff !== 0) return ratingDiff;

        return a.name.localeCompare(b.name, 'ko');
      }

      if (sortBy === 'distance') {
        const distanceDiff = distanceOrder[a.distance] - distanceOrder[b.distance];
        if (distanceDiff !== 0) return distanceDiff;

        const ratingDiff = b.avgRating - a.avgRating;
        if (ratingDiff !== 0) return ratingDiff;

        const noteCountDiff = b.notes.length - a.notes.length;
        if (noteCountDiff !== 0) return noteCountDiff;

        return a.name.localeCompare(b.name, 'ko');
      }

      if (sortBy === 'price') {
        const priceDiff = priceOrder[a.price] - priceOrder[b.price];
        if (priceDiff !== 0) return priceDiff;

        const ratingDiff = b.avgRating - a.avgRating;
        if (ratingDiff !== 0) return ratingDiff;

        const noteCountDiff = b.notes.length - a.notes.length;
        if (noteCountDiff !== 0) return noteCountDiff;

        return a.name.localeCompare(b.name, 'ko');
      }

      if (sortBy === 'name') {
        return a.name.localeCompare(b.name, 'ko');
      }

      return 0;
    });

    return sorted.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  }, [mergedRestaurants, search, distanceFilter, priceFilter, waitingFilter, sortBy]);

  const selectedRestaurant: RestaurantWithNotes | null =
    visibleRestaurants.find((restaurant) => restaurant.id === selectedRestaurantId) ??
    mergedRestaurants.find((restaurant) => restaurant.id === selectedRestaurantId) ??
    visibleRestaurants[0] ??
    null;

  useEffect(() => {
    if (selectedRestaurantId === null && visibleRestaurants[0]) {
      setSelectedRestaurantId(visibleRestaurants[0].id);
    }
  }, [selectedRestaurantId, visibleRestaurants]);

  function handleNicknameLogin() {
    const value = nicknameInput.trim();
    setNickname(value);
    window.localStorage.setItem('lunch_nickname', value);
  }

  function handleLogout() {
    setNickname('');
    setNicknameInput('');
    window.localStorage.removeItem('lunch_nickname');
  }

  const isAdmin = nickname.trim() === 'admin';
  
  const isOwner =
  !!nickname.trim() &&
  !!selectedRestaurant &&
  selectedRestaurant.created_by?.trim().toLowerCase() ===
    nickname.trim().toLowerCase();

  const canEditOrDelete =
  !!nickname.trim() &&
  !!selectedRestaurant &&
  (
    isAdmin ||
    selectedRestaurant.created_by?.trim().toLowerCase() ===
      nickname.trim().toLowerCase()
  );

  async function handleCreateRestaurant() {
    if (!supabase) return;

    if (!nickname.trim()) {
      alert('닉네임으로 먼저 로그인해주세요~ (익명가능)');
      return;
    }

     const normalizedName = restaurantForm.name.trim().toLowerCase();

    if (!restaurantForm.name.trim()) {
      alert('식당 이름을 입력!');
      return;
    }

    const alreadyExists = restaurants.some(
    (restaurant) => restaurant.name.trim().toLowerCase() === normalizedName
    );

    if (alreadyExists) {
      alert('이미 등록된 식당이에요!');
      return;
    }

    setSaving(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase
        .from('restaurants')
        .insert({
          name: restaurantForm.name.trim(),
          category: restaurantForm.category.trim(),
          distance: restaurantForm.distance,
          price: restaurantForm.price,
          waiting: restaurantForm.waiting,
          recommended_menu: restaurantForm.recommended_menu.trim() || null,
          created_by: nickname.trim(),
        })
        .select()
        .single();

      if (error) {
        setErrorMessage(error.message);
        alert(`식당 등록 실패: ${error.message}`);
        return;
      }

      if (data) {
        const typed = data as Restaurant;
        setRestaurants((prev) => [typed, ...prev]);
        setSelectedRestaurantId(typed.id);
        setRestaurantForm(initialRestaurantForm);
        setEditMode(false);
      }
    } finally {
      setSaving(false);
    }
  }

  function beginEditRestaurant() {
    if (!selectedRestaurant) return;

    setRestaurantForm({
      name: selectedRestaurant.name,
      category: selectedRestaurant.category,
      distance: selectedRestaurant.distance,
      price: selectedRestaurant.price,
      waiting: selectedRestaurant.waiting,
      recommended_menu: selectedRestaurant.recommended_menu ?? '',
    });
    setEditMode(true);
  }

  async function handleSaveRestaurantEdit() {
    if (!supabase || !selectedRestaurant) return;

    if (!nickname.trim()) {
      alert('닉네임으로 먼저 로그인해주세요~ (익명가능)');
      return;
    }

    if (!restaurantForm.name.trim()) {
      alert('식당 이름을 입력!');
      return;
    }

        const canEdit =
      !!nickname.trim() &&
      !!selectedRestaurant &&
      (
        isAdmin ||
        selectedRestaurant.created_by?.trim().toLowerCase() ===
          nickname.trim().toLowerCase()
      );

    if (!canEdit) {
      alert('본인이 등록한 식당만 수정할 수 있어요.');
      return;
    }

    setSaving(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase
        .from('restaurants')
        .update({
          name: restaurantForm.name.trim(),
          category: restaurantForm.category.trim(),
          distance: restaurantForm.distance,
          price: restaurantForm.price,
          waiting: restaurantForm.waiting,
          recommended_menu: restaurantForm.recommended_menu.trim() || null,
        })
        .eq('id', selectedRestaurant.id)
        .select()
        .single();

      if (error) {
        setErrorMessage(error.message);
        alert(`식당 수정 실패: ${error.message}`);
        return;
      }

      if (data) {
        const typed = data as Restaurant;
        setRestaurants((prev) =>
          prev.map((item) => (item.id === typed.id ? typed : item))
        );
        setEditMode(false);
        setRestaurantForm(initialRestaurantForm);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAddNote() {
    if (!supabase || !selectedRestaurant) return;

    if (!nickname.trim()) {
      alert('닉네임으로 먼저 로그인해주세요~ (익명가능)');
      return;
    }

    if (!noteForm.text.trim()) {
      alert('후기 내용을 입력!');
      return;
    }

    setSaving(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          restaurant_id: selectedRestaurant.id,
          nickname: nickname.trim(),
          rating: noteForm.rating,
          waiting: selectedRestaurant.waiting,
          distance: selectedRestaurant.distance,
          price: selectedRestaurant.price,
          recommended_menu: selectedRestaurant.recommended_menu ?? null,
          day_label: null,
          text: noteForm.text.trim(),
        })
        .select()
        .single();

      if (error) {
        setErrorMessage(error.message);
        alert(`후기 등록 실패: ${error.message}`);
        return;
      }

      if (data) {
        setNotes((prev) => [data as Note, ...prev]);
        setNoteForm(initialNoteForm);
        setOpenNoteRestaurantId(selectedRestaurant.id);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteNote(note: Note) {
    if (!supabase) return;

    const canDeleteNote =
      !!nickname.trim() &&
       (isAdmin ||
      note.nickname.trim().toLowerCase() === nickname.trim().toLowerCase());

    if (!canDeleteNote) {
      alert('본인이 작성한 후기만 삭제할 수 있어요.');
      return;
    }

    const ok = window.confirm('이 후기를 삭제할까요...ㅜㅜ?');
    if (!ok) return;

    setSaving(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase
        .from('notes')
        .delete()
        .eq('id', note.id)
        .select('id');

      if (error) {
        setErrorMessage(error.message);
        alert(`삭제 실패: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        const message = '삭제 요청은 갔는데 실제로 삭제된 후기가 없어. RLS나 id 타입을 확인해봐.';
        setErrorMessage(message);
        alert(message);
        return;
      }

      await fetchData();
    } finally {
      setSaving(false);
    }
  }

  function toggleRestaurantNotes(restaurantId: number) {
    setOpenNoteRestaurantId((prev) => (prev === restaurantId ? null : restaurantId));
  }

  async function handleDeleteRestaurant(restaurantId: number) {
    if (!supabase) return;

    const targetRestaurant = restaurants.find(
    (restaurant) => restaurant.id === restaurantId
    );

    const canDelete =
      !!nickname.trim() &&
      !!targetRestaurant &&
      (
        isAdmin ||
        targetRestaurant.created_by?.trim().toLowerCase() ===
          nickname.trim().toLowerCase()
      );

    if (!canDelete) {
      alert('본인이 등록한 식당만 삭제할 수 있어요.');
      return;
    }

    const ok = window.confirm('이 식당을 삭제할까요? 연결된 후기도 같이 삭제됩니다.');
    if (!ok) return;

    setSaving(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', restaurantId)
        .select('id');

      if (error) {
        setErrorMessage(error.message);
        alert(`식당 삭제 실패: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        const message = '삭제 요청은 갔는데 실제로 삭제된 식당이 없어. RLS나 id 타입을 확인해봐.';
        setErrorMessage(message);
        alert(message);
        return;
      }

      if (selectedRestaurantId === restaurantId) {
        setSelectedRestaurantId(null);
        setEditMode(false);
      }

      if (openNoteRestaurantId === restaurantId) {
        setOpenNoteRestaurantId(null);
      }

      await fetchData();
    } finally {
      setSaving(false);
    }
  }

  const topThree = visibleRestaurants.slice(0, 3);

  return (
    <main className="page-shell yulchon-theme">
      <section className="hero-card yulchon-hero">
        <div className="hero-brand">
          <div className="hero-logo-box">
            <Image
              src="/yulchon-logo.png"
              alt="Yulchon logo"
              width={260}
              height={130}
              className="hero-logo"
              priority
            />
          </div>

          <div className="hero-copy">
            <span className="pill brand"> 🤍 율촌 식당 공유 사이트 🤍 </span>
            <h1>율촌만의 캐치테이블 🍽️</h1>
            <p>
              닉네임으로 로그인 후, 식당을 직접 등록하거나 수정하고 별점과 후기를 남겨서
              정보를 공유해보아요오-!!!
              <br />
              <br />
              <span className="muted small">
                관련 피드백 (추가했으면 하는 기능 등)이 있다면 인프라보안팀 인턴 유예지에게 팀즈로 편하게 주세요!
              </span>
            </p>
          </div>
        </div>

        <div className="login-card brand-login-card">
          <div className="section-label">닉네임 로그인 (익명가능)</div>
          {!nickname ? (
            <>
              <input
                className="input"
                placeholder="닉네임 입력"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
              />
              <button className="button primary" onClick={handleNicknameLogin}>
                입장하기
              </button>
            </>
          ) : (
            <>
              <div className="user-box">
                <div className="muted">현재 로그인</div>
                <strong>{nickname}</strong>
              </div>
              <button className="button secondary" onClick={handleLogout}>
                로그아웃
              </button>
            </>
          )}
        </div>
      </section>

      {!isSupabaseConfigured && (
        <section className="warning-card">
          <strong>Supabase 환경변수가 아직 없어.</strong>
          <p>
            .env.local 파일에 NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY를 넣고,
            supabase/schema.sql을 실행하면 바로 연결돼.
          </p>
        </section>
      )}

      {errorMessage && (
        <section className="warning-card error">
          <strong>오류</strong>
          <p>{errorMessage}</p>
        </section>
      )}

      <section className="stats-grid">
        <article className="stat-card dark">
          <div className="muted light">등록된 식당</div>
          <strong>{restaurants.length}</strong>
        </article>
        <article className="stat-card">
          <div className="muted">후기 개수</div>
          <strong>{notes.length}</strong>
        </article>
        <article className="stat-card">
          <div className="muted">현재 1위</div>
          <strong>{topThree[0]?.name ?? '-'}</strong>
          <span>
            ★ {topThree[0]?.avgRating?.toFixed(1) ?? '0.0'} · 후기{' '}
            {topThree[0]?.notes?.length ?? 0}개
          </span>
        </article>
      </section>

      <section className="main-grid">
        <div className="left-column">
          <article className="panel">
            <div className="panel-header">
              <h2>필터 / 정렬</h2>
            </div>

            <div className="control-grid five">
              <input
                className="input"
                placeholder="검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <select
                className="select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="rating">별점순</option>
                <option value="reviews">후기 많은순</option>
                <option value="distance">가까운순</option>
                <option value="price">저렴한순</option>
                <option value="name">이름순</option>
              </select>

              <select
                className="select"
                value={distanceFilter}
                onChange={(e) =>
                  setDistanceFilter(e.target.value as '전체' | DistanceLevel)
                }
              >
                <option value="전체">거리 전체</option>
                <option value="가깝다">가깝다</option>
                <option value="적당">적당</option>
                <option value="멀다">멀다</option>
              </select>

              <select
                className="select"
                value={priceFilter}
                onChange={(e) =>
                  setPriceFilter(e.target.value as '전체' | PriceLevel)
                }
              >
                <option value="전체">가격 전체</option>
                <option value="싸다">싸다</option>
                <option value="적당">적당</option>
                <option value="비싸다">비싸다</option>
              </select>

              <select
                className="select"
                value={waitingFilter}
                onChange={(e) =>
                  setWaitingFilter(
                    e.target.value as '전체' | '웨이팅 있음' | '웨이팅 없음'
                  )
                }
              >
                <option value="전체">웨이팅 전체</option>
                <option value="웨이팅 있음">웨이팅 있음</option>
                <option value="웨이팅 없음">웨이팅 없음</option>
              </select>
            </div>
          </article>

          <article className="panel">
            <div className="panel-header between">
              <h2>식당 등록</h2>
              <span className="muted">로그인한 닉네임으로 등록됨</span>
            </div>

            <div className="form-grid two">
              <div className="form-row">
                <label>식당 이름</label>
                <input
                  className="input"
                  placeholder="식당 이름"
                  value={restaurantForm.name}
                  onChange={(e) =>
                    setRestaurantForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              <div className="form-row">
                <label>대표 추천 메뉴</label>
                <input
                  className="input"
                  placeholder="추천 메뉴"
                  value={restaurantForm.recommended_menu}
                  onChange={(e) =>
                    setRestaurantForm((prev) => ({
                      ...prev,
                      recommended_menu: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="form-row">
                <label>카테고리</label>
                <select
                  className="select"
                  value={restaurantForm.category}
                  onChange={(e) =>
                    setRestaurantForm((prev) => ({ ...prev, category: e.target.value }))
                  }
                >
                  <option>한식</option>
                  <option>일식</option>
                  <option>중식</option>
                  <option>양식</option>
                  <option>분식</option>
                  <option>샐러드</option>
                  <option>기타</option>
                </select>
              </div>

              <div className="form-row">
                <label>거리</label>
                <select
                  className="select"
                  value={restaurantForm.distance}
                  onChange={(e) =>
                    setRestaurantForm((prev) => ({
                      ...prev,
                      distance: e.target.value as DistanceLevel,
                    }))
                  }
                >
                  <option value="가깝다">가깝다</option>
                  <option value="적당">적당</option>
                  <option value="멀다">멀다</option>
                </select>
              </div>

              <div className="form-row">
                <label>가격</label>
                <select
                  className="select"
                  value={restaurantForm.price}
                  onChange={(e) =>
                    setRestaurantForm((prev) => ({
                      ...prev,
                      price: e.target.value as PriceLevel,
                    }))
                  }
                >
                  <option value="싸다">싸다</option>
                  <option value="적당">적당</option>
                  <option value="비싸다">비싸다</option>
                </select>
              </div>

              <div className="form-row">
                <label>웨이팅 여부</label>
                <select
                  className="select"
                  value={restaurantForm.waiting ? '있음' : '없음'}
                  onChange={(e) =>
                    setRestaurantForm((prev) => ({
                      ...prev,
                      waiting: e.target.value === '있음',
                    }))
                  }
                >
                  <option value="없음">웨이팅 없음</option>
                  <option value="있음">웨이팅 있음</option>
                </select>
              </div>
            </div>

            <button
              className="button primary block"
              onClick={handleCreateRestaurant}
              disabled={saving || !supabase}
            >
              식당 등록하기
            </button>
          </article>

          <article className="panel">
            <div className="panel-header between">
              <h2>식당 랭킹</h2>
              <span className="muted">평균 별점 우선 · 동점 시 후기 많은 순</span>
            </div>

            {loading ? (
              <div className="empty-box">불러오는 중...</div>
            ) : visibleRestaurants.length === 0 ? (
              <div className="empty-box">조건에 맞는 식당이 없어요 ㅜㅜ</div>
            ) : (
              <div className="restaurant-list">
                {visibleRestaurants.map((restaurant) => (
                  <div
                    key={restaurant.id}
                    className={
                      restaurant.id === selectedRestaurant?.id
                        ? 'restaurant-card active'
                        : 'restaurant-card'
                    }
                  >
                    <button
                      type="button"
                      className="restaurant-main-button"
                      onClick={() => {
                        setSelectedRestaurantId(restaurant.id);
                        setEditMode(false);
                      }}
                    >
                      <div className="restaurant-top">
                        <div>
                          <span className="pill">#{restaurant.rank}</span>
                          <h3>{restaurant.name}</h3>
                          <p>
                            {restaurant.category} · 추천 메뉴{' '}
                            {restaurant.recommended_menu ?? '없음'}
                          </p>
                        </div>

                        <div className="restaurant-score">
                          <strong>★ {restaurant.avgRating.toFixed(1)}</strong>
                          <span>후기 {restaurant.notes.length}개</span>
                        </div>
                      </div>

                      <div className="chip-row">
                        <span className="tag">거리: {restaurant.distance}</span>
                        <span className="tag">가격: {restaurant.price}</span>
                        <span className="tag">
                          웨이팅: {restaurant.waiting ? '있음' : '없음'}
                        </span>
                      </div>
                    </button>

                    <div className="button-row">
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => toggleRestaurantNotes(restaurant.id)}
                      >
                        {openNoteRestaurantId === restaurant.id ? '후기 닫기' : '후기 보기'}
                      </button>
                    </div>

                    {openNoteRestaurantId === restaurant.id && (
                      <div className="note-list inline">
                        {restaurant.notes.length === 0 ? (
                          <div className="empty-box small">아직 후기가 없어요...</div>
                        ) : (
                          restaurant.notes.map((note) => (
                            <div key={note.id} className="note-item-simple">
                              <div className="note-item-top">
                                <strong>{note.nickname}</strong>
                                <span>★ {note.rating.toFixed(1)}</span>
                              </div>
                              <p className="note-text">{note.text}</p>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </article>
        </div>

        <div className="right-column">
          <article className="panel">
            <div className="panel-header between">
              <h2>상세 정보</h2>
              {selectedRestaurant && (
                <span className="muted">등록자 {selectedRestaurant.created_by}</span>
              )}
            </div>

            {!selectedRestaurant ? (
              <div className="empty-box">식당을 선택해주세여.</div>
            ) : (
              <>
                <div className="detail-hero">
                  <div>
                    <h3>{selectedRestaurant.name}</h3>
                    <p>{selectedRestaurant.category}</p>
                  </div>
                  <div className="score-box">★ {selectedRestaurant.avgRating.toFixed(1)}</div>
                </div>

                <div className="chip-row wrap">
                  <span className="tag">거리: {selectedRestaurant.distance}</span>
                  <span className="tag">가격: {selectedRestaurant.price}</span>
                  <span className="tag">
                    웨이팅: {selectedRestaurant.waiting ? '있음' : '없음'}
                  </span>
                  <span className="tag">
                    추천 메뉴: {selectedRestaurant.recommended_menu ?? '없음'}
                  </span>
                </div>

                <div className="button-row">
                  {canEditOrDelete && (
                    <button
                      type="button"
                      className="button secondary"
                      onClick={beginEditRestaurant}
                    >
                      식당 정보 수정하기
                    </button>
                  )}
                  

                  {canEditOrDelete && selectedRestaurant && (
                    <button
                      type="button"
                      className="button danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteRestaurant(selectedRestaurant.id);
                      }}
                      disabled={saving}
                    >
                      식당 삭제
                    </button>
                  )}
                </div>

                {editMode && (
                  <div className="edit-box">
                    <div className="section-label">식당 수정</div>

                    <div className="form-grid two">
                      <div className="form-row">
                        <label>식당 이름</label>
                        <input
                          className="input"
                          placeholder="식당 이름"
                          value={restaurantForm.name}
                          onChange={(e) =>
                            setRestaurantForm((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="form-row">
                        <label>대표 추천 메뉴</label>
                        <input
                          className="input"
                          placeholder="추천 메뉴"
                          value={restaurantForm.recommended_menu}
                          onChange={(e) =>
                            setRestaurantForm((prev) => ({
                              ...prev,
                              recommended_menu: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="form-row">
                        <label>카테고리</label>
                        <select
                          className="select"
                          value={restaurantForm.category}
                          onChange={(e) =>
                            setRestaurantForm((prev) => ({
                              ...prev,
                              category: e.target.value,
                            }))
                          }
                        >
                          <option>한식</option>
                          <option>일식</option>
                          <option>중식</option>
                          <option>양식</option>
                          <option>분식</option>
                          <option>샐러드</option>
                          <option>기타</option>
                        </select>
                      </div>

                      <div className="form-row">
                        <label>거리</label>
                        <select
                          className="select"
                          value={restaurantForm.distance}
                          onChange={(e) =>
                            setRestaurantForm((prev) => ({
                              ...prev,
                              distance: e.target.value as DistanceLevel,
                            }))
                          }
                        >
                          <option value="가깝다">가깝다</option>
                          <option value="적당">적당</option>
                          <option value="멀다">멀다</option>
                        </select>
                      </div>

                      <div className="form-row">
                        <label>가격</label>
                        <select
                          className="select"
                          value={restaurantForm.price}
                          onChange={(e) =>
                            setRestaurantForm((prev) => ({
                              ...prev,
                              price: e.target.value as PriceLevel,
                            }))
                          }
                        >
                          <option value="싸다">싸다</option>
                          <option value="적당">적당</option>
                          <option value="비싸다">비싸다</option>
                        </select>
                      </div>

                      <div className="form-row">
                        <label>웨이팅 여부</label>
                        <select
                          className="select"
                          value={restaurantForm.waiting ? '있음' : '없음'}
                          onChange={(e) =>
                            setRestaurantForm((prev) => ({
                              ...prev,
                              waiting: e.target.value === '있음',
                            }))
                          }
                        >
                          <option value="없음">웨이팅 없음</option>
                          <option value="있음">웨이팅 있음</option>
                        </select>
                      </div>
                    </div>

                    <div className="button-row">
                      <button
                        type="button"
                        className="button primary"
                        onClick={handleSaveRestaurantEdit}
                        disabled={saving || !supabase}
                      >
                        수정 저장
                      </button>
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => setEditMode(false)}
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </article>

          <article className="panel">
            <div className="panel-header between">
              <h2>후기 작성</h2>
              <span className="muted">별점 + 후기만 작성</span>
            </div>

            {!selectedRestaurant ? (
              <div className="empty-box">먼저 식당을 선택해주세여</div>
            ) : (
              <div className="note-form-wrap">
                <div className="form-row">
                  <label>별점</label>
                  <StarRating
                    value={noteForm.rating}
                    onChange={(rating) =>
                      setNoteForm((prev) => ({ ...prev, rating }))
                    }
                  />
                </div>

                <div className="form-row">
                  <label>후기</label>
                  <textarea
                    className="textarea"
                    rows={8}
                    placeholder="먹어본 메뉴, 추천 이유, 꿀팁, 다시 갈 의향, 몇번 갔는지 등을 자유롭게 적어주세용 🥰"
                    value={noteForm.text}
                    onChange={(e) =>
                      setNoteForm((prev) => ({ ...prev, text: e.target.value }))
                    }
                  />
                </div>

                <button
                  type="button"
                  className="button primary block"
                  onClick={handleAddNote}
                  disabled={saving || !supabase}
                >
                  후기 등록하기
                </button>
              </div>
            )}
          </article>

          <article className="panel">
            <div className="panel-header between">
              <h2>후기 모아보기</h2>
              <span className="muted">닉네임 + 작성 내용</span>
            </div>

            {!selectedRestaurant ? (
              <div className="empty-box">식당을 선택하면 후기가 보여요!!</div>
            ) : selectedRestaurant.notes.length === 0 ? (
              <div className="empty-box">아직 후기가 없어요ㅜㅜ 첫 후기를 남겨주세여~</div>
            ) : (
              <div className="note-list">
                {selectedRestaurant.notes.map((note) => (
                  <div key={note.id} className="note-item-simple">
                    <div className="note-item-top">
                      <div>
                        <strong>{note.nickname}</strong>
                        <div className="muted small">
                          {new Date(note.created_at).toLocaleDateString('ko-KR')}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>★ {note.rating.toFixed(1)}</span>

                        {canEditNote(note) && (
                          <button
                            type="button"
                            className="button secondary small"
                            onClick={(e) => {
                              e.stopPropagation();
                              beginEditNote(note);
                            }}
                            disabled={saving}
                          >
                            수정
                          </button>
                        )}

                        {(isAdmin ||
                          note.nickname.trim().toLowerCase() === nickname.trim().toLowerCase()) && (
                          <button
                            type="button"
                            className="button danger small"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDeleteNote(note);
                            }}
                            disabled={saving}
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </div>

                    {editingNoteId === note.id ? (
                    <div className="edit-box">
                      <div className="form-row">
                        <label>별점</label>
                        <StarRating
                          value={editNoteForm.rating}
                          onChange={(rating) =>
                            setEditNoteForm((prev) => ({ ...prev, rating }))
                          }
                        />
                      </div>

                      <div className="form-row">
                        <label>후기</label>
                        <textarea
                          className="textarea"
                          rows={5}
                          value={editNoteForm.text}
                          onChange={(e) =>
                            setEditNoteForm((prev) => ({ ...prev, text: e.target.value }))
                          }
                        />
                      </div>

                      <div className="button-row">
                        <button
                          type="button"
                          className="button primary small"
                          onClick={() => void handleSaveNoteEdit(note.id)}
                          disabled={saving}
                        >
                          저장
                        </button>

                        <button
                          type="button"
                          className="button secondary small"
                          onClick={() => {
                            setEditingNoteId(null);
                            setEditNoteForm(initialNoteForm);
                          }}
                          disabled={saving}
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="note-text">{note.text}</p>
                  )}
                  </div>
                ))}
              </div>
            )}
          </article>
        </div>
      </section>
    </main>
  );
}