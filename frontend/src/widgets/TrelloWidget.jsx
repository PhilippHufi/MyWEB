import React, { useEffect, useState } from 'react';
import { DndContext, closestCenter, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ExternalLink, Kanban, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { Button } from '../components/Button';
import { ErrorState } from '../components/ErrorState';
import { Loader } from '../components/Loader';

export function TrelloWidget({ title = 'To-do Board', intro = true }) {
  const [boards, setBoards] = useState([]);
  const [boardId, setBoardId] = useState('');
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [boardName, setBoardName] = useState('');
  const [listName, setListName] = useState('');
  const [cardDrafts, setCardDrafts] = useState({});
  const activeBoard = boards.find((board) => board.id === boardId);

  async function loadBoards() {
    setLoading(true);
    setError('');
    try {
      const nextBoards = await api.trelloBoards();
      setBoards(nextBoards);
      setBoardId((current) => current || nextBoards[0]?.id || '');
    } catch (err) {
      setError(readableTrelloError(err.message));
    } finally {
      setLoading(false);
    }
  }

  async function loadTasks(id = boardId) {
    if (!id) {
      setLists([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setLists(await api.trelloTasks(id));
    } catch (err) {
      setError(readableTrelloError(err.message));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadBoards(); }, []);
  useEffect(() => { loadTasks(boardId); }, [boardId]);

  async function createBoard(event) {
    event.preventDefault();
    const name = boardName.trim();
    if (!name) return;
    setLoading(true);
    try {
      const board = await api.createTrelloBoard(name);
      setBoards((items) => [...items, board]);
      setBoardId(board.id);
      setBoardName('');
    } catch (err) {
      setError(readableTrelloError(err.message));
    } finally {
      setLoading(false);
    }
  }

  async function createList(event) {
    event.preventDefault();
    const name = listName.trim();
    if (!name || !boardId) return;
    try {
      await api.createTrelloList(boardId, name);
      setListName('');
      await loadTasks();
    } catch (err) {
      setError(readableTrelloError(err.message));
    }
  }

  async function createCard(event, listId) {
    event.preventDefault();
    const draft = cardDrafts[listId] || {};
    const name = String(draft.name || '').trim();
    if (!name) return;
    try {
      await api.createTrelloCard(listId, { name, description: draft.description || '', due: draft.due || '' });
      setCardDrafts((items) => ({ ...items, [listId]: { name: '', description: '', due: '' } }));
      await loadTasks();
    } catch (err) {
      setError(readableTrelloError(err.message));
    }
  }

  async function updateCard(cardId, patch) {
    try {
      await api.updateTrelloCard(cardId, patch);
      await loadTasks();
    } catch (err) {
      setError(readableTrelloError(err.message));
    }
  }

  async function archiveCard(cardId) {
    if (!window.confirm('Karte wirklich archivieren?')) return;
    try {
      await api.archiveTrelloCard(cardId);
      await loadTasks();
    } catch (err) {
      setError(readableTrelloError(err.message));
    }
  }

  async function onDragEnd(event) {
    const cardId = event.active?.id;
    const listId = event.over?.id;
    if (!cardId || !listId || lists.some((list) => list.id === cardId)) return;
    try {
      await api.moveTrelloCard(cardId, listId);
      await loadTasks();
    } catch (err) {
      setError(readableTrelloError(err.message));
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Kanban className="h-5 w-5 text-cyan-500" />
              <h2 className="text-xl font-semibold">{title}</h2>
            </div>
            {intro && <p className="mt-1 text-sm text-zinc-500">Trello-Boards, Listen und Karten direkt in deiner Webseite. Karten kannst du per Drag & Drop zwischen Listen verschieben.</p>}
          </div>
          <Button type="button" onClick={() => loadTasks()} disabled={loading}><RefreshCw className="h-4 w-4" />{loading ? 'Lade...' : 'Aktualisieren'}</Button>
        </div>
      </section>

      <ErrorState message={error} />

      <section className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 xl:grid-cols-[1fr_1fr_auto]">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Board</label>
          <select className="input" value={boardId} onChange={(event) => setBoardId(event.target.value)}>
            {boards.map((board) => <option key={board.id} value={board.id}>{board.name}</option>)}
          </select>
        </div>
        <form className="flex items-end gap-2" onSubmit={createBoard}>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Neues Board</label>
            <input className="input" value={boardName} onChange={(event) => setBoardName(event.target.value)} placeholder="z.B. Privat, Arbeit, Urlaub" />
          </div>
          <Button type="submit"><Plus className="h-4 w-4" />Board</Button>
        </form>
        {activeBoard?.url && <Button type="button" className="self-end bg-zinc-700" onClick={() => window.open(activeBoard.url, '_blank', 'noopener,noreferrer')}><ExternalLink className="h-4 w-4" />Trello</Button>}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={createList}>
          <input className="input" value={listName} onChange={(event) => setListName(event.target.value)} placeholder="Neue Liste, z.B. Ideen, To-do, In Arbeit, Erledigt" disabled={!boardId} />
          <Button type="submit" disabled={!boardId}><Plus className="h-4 w-4" />Liste erstellen</Button>
        </form>
      </section>

      {loading && <Loader />}
      {!loading && !boards.length && <EmptyState text="Noch kein Trello-Board gefunden. Erstelle oben ein Board oder pruefe deinen Trello Token." />}
      {!loading && boardId && !lists.length && <EmptyState text="Dieses Board hat noch keine Listen. Erstelle eine Liste, um Karten anzulegen." />}

      <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-4">
          {lists.map((list) => (
            <TrelloList
              key={list.id}
              list={list}
              draft={cardDrafts[list.id] || { name: '', description: '', due: '' }}
              setDraft={(draft) => setCardDrafts((items) => ({ ...items, [list.id]: draft }))}
              createCard={(event) => createCard(event, list.id)}
              updateCard={updateCard}
              archiveCard={archiveCard}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function TrelloList({ list, draft, setDraft, createCard, updateCard, archiveCard }) {
  const { setNodeRef, isOver } = useDroppable({ id: list.id });
  return (
    <section ref={setNodeRef} className={`min-h-72 rounded-lg border p-3 shadow-sm transition ${isOver ? 'border-cyan-400 bg-cyan-50 dark:bg-cyan-950/30' : 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900'}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-semibold">{list.name}</h3>
        <span className="rounded bg-white px-2 py-1 text-xs text-zinc-500 dark:bg-zinc-800">{list.cards.length}</span>
      </div>
      <div className="space-y-2">
        {list.cards.map((card) => <TrelloCard key={card.id} card={card} updateCard={updateCard} archiveCard={archiveCard} />)}
      </div>
      <form className="mt-3 space-y-2 rounded-md border border-dashed border-zinc-300 p-2 dark:border-zinc-700" onSubmit={createCard}>
        <input className="input" value={draft.name || ''} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Neue Karte" />
        <textarea className="input min-h-20" value={draft.description || ''} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Beschreibung / Unterpunkte" />
        <input className="input" type="date" value={draft.due || ''} onChange={(event) => setDraft({ ...draft, due: event.target.value })} />
        <Button type="submit" className="w-full"><Plus className="h-4 w-4" />Karte hinzufügen</Button>
      </form>
    </section>
  );
}

function TrelloCard({ card, updateCard, archiveCard }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: card.name, description: card.description || '', due: card.due ? card.due.slice(0, 10) : '' });
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id });

  useEffect(() => {
    setDraft({ name: card.name, description: card.description || '', due: card.due ? card.due.slice(0, 10) : '' });
  }, [card.id, card.name, card.description, card.due]);

  async function save(event) {
    event.preventDefault();
    await updateCard(card.id, draft);
    setEditing(false);
  }

  if (editing) {
    return (
      <form className="space-y-2 rounded-md border border-cyan-300 bg-white p-3 text-sm shadow dark:bg-zinc-950" onSubmit={save}>
        <input className="input" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        <textarea className="input min-h-20" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
        <input className="input" type="date" value={draft.due || ''} onChange={(event) => setDraft({ ...draft, due: event.target.value })} />
        <div className="flex gap-2">
          <Button type="submit">Speichern</Button>
          <Button type="button" className="bg-zinc-600" onClick={() => setEditing(false)}>Abbrechen</Button>
        </div>
      </form>
    );
  }

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`rounded-md border border-zinc-200 bg-white p-3 text-sm shadow-sm transition dark:border-zinc-800 dark:bg-zinc-950 ${isDragging ? 'opacity-60 ring-2 ring-cyan-300' : ''}`}
    >
      <div className="cursor-grab" {...attributes} {...listeners}>
        <h4 className="font-semibold">{card.name}</h4>
        {card.due && <p className="mt-1 text-xs text-zinc-500">Fällig: {new Date(card.due).toLocaleDateString('de-AT')}</p>}
      </div>
      <div className="mt-3 flex gap-2">
        <Button type="button" className="h-8 bg-zinc-700 px-2" onClick={() => setEditing(true)}>Bearbeiten</Button>
        <button type="button" className="icon-btn" onClick={() => archiveCard(card.id)} aria-label="Archivieren"><Trash2 className="h-4 w-4" /></button>
      </div>
    </article>
  );
}

function EmptyState({ text }) {
  return <section className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">{text}</section>;
}

function readableTrelloError(message = '') {
  if (/invalid token|unauthorized|401/i.test(message)) return 'Trello-Zugriff abgelehnt. Bitte TRELLO_API_KEY und TRELLO_TOKEN pruefen.';
  return message || 'Trello konnte gerade nicht geladen werden.';
}
