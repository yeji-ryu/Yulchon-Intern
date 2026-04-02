'use client';

import { useEffect, useMemo, useState } from 'react';
import StarRating from '@/components/StarRating';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { mergeRestaurants, sortRestaurants } from '@/lib/utils';
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
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');
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
  const [openNoteRestaurantId, setOpenNoteRestaurantId] = useState<string>('');

  useEffect(() => {
    const savedNickname = window.localStorage.getItem('lunch_nickname') ?? '';
    setNickname(savedNickname);
    setNicknameInput(savedNickname);
  }, []);

  useEffect(() => {
    void fetchData();
  }, []);

  async function fetchData() {
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    const [restaurantResult, noteResult] = await Promise.all([
      supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase.from('notes').select('*').order('created_at', { ascending: false }),
    ]);

    if (restaurantResult.error) {
      setErrorMessage(restaurantResult.error.message);
      setLoading(false);
      return;
    }

    if (noteResult.error) {
      setErrorMessage(noteResult.error.message);
      setLoading(false);
      return;
    }

    const nextRestaurants = (restaurantResult.data ?? []) as Restaurant[];
    const nextNotes = (noteResult.data ?? []) as Note[];

    setRestaurants(nextRestaurants);
    setNotes(nextNotes);

    if (nextRestaurants.length > 0) {
      setSelectedRestaurantId((prev) => prev || nextRestaurants[0].id);
    }

    setLoading(false);
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

    return sortRestaurants(filtered, sortBy).map((item, index) => ({
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
    if (!selectedRestaurantId && visibleRestaurants[0]) {
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

  async function handleCreateRestaurant() {
    if (!supabase) return;

    if (!nickname.trim()) {
      alert('닉네임으로 먼저 로그인해주세요~ (익명가능)');
      return;
    }

    if (!restaurantForm.name.trim()) {
      alert('식당 이름을 입력!');
      return;
    }

    setSaving(true);
    setErrorMessage('');

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

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (data) {
      const typed = data as Restaurant;
      setRestaurants((prev) => [typed, ...prev]);
      setSelectedRestaurantId(typed.id);
      setRestaurantForm(initialRestaurantForm);
      setEditMode(false);
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

    setSaving(true);
    setErrorMessage('');

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

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
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
  }

  async function handleAddNote() {
    if (!supabase || !selectedRestaurant) return;

    if (!nickname.trim()) {
      alert('닉네임으로 먼저 로그인해주세요~ (익명가능)');
      return;
    }

    if (!noteForm.text.trim()) {
      alert('비고 내용을 입력!');
      return;
    }

    setSaving(true);
    setErrorMessage('');

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

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (data) {
      setNotes((prev) => [data as Note, ...prev]);
      setNoteForm(initialNoteForm);
      setOpenNoteRestaurantId(selectedRestaurant.id);
    }
  }

  function toggleRestaurantNotes(restaurantId: string) {
    setOpenNoteRestaurantId((prev) => (prev === restaurantId ? '' : restaurantId));
  }

  const topThree = visibleRestaurants.slice(0, 3);

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <span className="pill dark">2026 상반기 율턴 식당 공유 사이트</span>
          <h1>식대 식당을 서로 공유해보아요 ~~</h1>
          <p>
            닉네임으로 로그인 후, 식당을 직접 등록하거나 수정하고, 별점과 후기를 남겨서
            퇴사 전까지 율턴만의 캐치테이블을 만들어봅시댜!
          </p>
        </div>

        <div className="login-card">
          <div className="section-label">닉네임 로그인</div>
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
          <div className="muted">비고 개수</div>
          <strong>{notes.length}</strong>
        </article>
        <article className="stat-card">
          <div className="muted">현재 1위</div>
          <strong>{topThree[0]?.name ?? '-'}</strong>
          <span>★ {topThree[0]?.avgRating?.toFixed(1) ?? '0.0'}</span>
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
                placeholder="식당명, 카테고리, 메뉴 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <select
                className="select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="rating">별점순</option>
                <option value="reviews">비고 많은순</option>
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
              <span className="muted">평균 별점 기준</span>
            </div>

            {loading ? (
              <div className="empty-box">불러오는 중...</div>
            ) : visibleRestaurants.length === 0 ? (
              <div className="empty-box">조건에 맞는 식당이 없어.</div>
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
                          <span>비고 {restaurant.notes.length}개</span>
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
                        {openNoteRestaurantId === restaurant.id ? '비고 닫기' : '비고 보기'}
                      </button>
                    </div>

                    {openNoteRestaurantId === restaurant.id && (
                      <div className="note-list inline">
                        {restaurant.notes.length === 0 ? (
                          <div className="empty-box small">아직 비고가 없어.</div>
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
                  <button
                    type="button"
                    className="button secondary"
                    onClick={beginEditRestaurant}
                  >
                    식당 정보 수정하기
                  </button>
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
                  <label>비고</label>
                  <textarea
                    className="textarea"
                    rows={8}
                    placeholder="먹어본 메뉴, 추천 이유, 꿀팁, 다시 갈 의향 등을 자유롭게 적어줘"
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
                      <span>★ {note.rating.toFixed(1)}</span>
                    </div>

                    <p className="note-text">{note.text}</p>
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