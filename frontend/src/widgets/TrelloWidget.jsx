import { Kanban, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DndContext, closestCenter, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { api } from '../services/api';
import { WidgetShell } from '../components/WidgetShell';
import { ErrorState } from '../components/ErrorState';
import { Loader } from '../components/Loader';

export function TrelloWidget(props) {
  const [boards, setBoards] = useState([]);
  const [boardId, setBoardId] = useState('');
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadBoards() {
    setLoading(true);
    setError('');
    try {
      const nextBoards = await api.trelloBoards();
      setBoards(nextBoards);
      setBoardId((current) => current || nextBoards[0]?.id || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadTasks(id = boardId) {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      setLists(await api.trelloTasks(id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadBoards(); }, []);
  useEffect(() => { loadTasks(boardId); }, [boardId]);

  async function onDragEnd(event) {
    const cardId = event.active?.id;
    const listId = event.over?.id;
    if (!cardId || !listId) return;
    await api.moveTrelloCard(cardId, listId);
    loadTasks();
  }

  return (
    <WidgetShell title="Trello" icon={Kanban} action={<button className="icon-soft" onClick={() => loadTasks()}><RefreshCw className="h-4 w-4" /></button>} className="lg:col-span-2" {...props}>
      <select className="life-input mb-4" value={boardId} onChange={(e) => setBoardId(e.target.value)}>
        {boards.map((board) => <option key={board.id} value={board.id}>{board.name}</option>)}
      </select>
      {loading && <Loader />}
      <ErrorState message={error} />
      <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div className="grid gap-3 md:grid-cols-3">
          {lists.slice(0, 3).map((list) => (
            <TrelloList key={list.id} list={list} />
          ))}
        </div>
      </DndContext>
    </WidgetShell>
  );
}

function TrelloList({ list }) {
  const { setNodeRef, isOver } = useDroppable({ id: list.id });
  return (
    <div ref={setNodeRef} className={`min-h-36 rounded-md p-3 transition ${isOver ? 'bg-cyan-300/15 ring-1 ring-cyan-300/60' : 'bg-white/5'}`}>
      <p className="mb-3 text-sm font-semibold text-cyan-200">{list.name}</p>
      <div className="space-y-2">
        {list.cards.map((card) => <TrelloCard key={card.id} card={card} />)}
      </div>
    </div>
  );
}

function TrelloCard({ card }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`cursor-grab rounded-md bg-slate-950/70 p-2 text-sm text-white shadow-lg transition ${isDragging ? 'opacity-60 ring-1 ring-cyan-300' : ''}`}
      {...attributes}
      {...listeners}
    >
      {card.name}
      {card.due && <p className="mt-1 text-xs text-slate-400">{new Date(card.due).toLocaleDateString('de-AT')}</p>}
    </div>
  );
}
