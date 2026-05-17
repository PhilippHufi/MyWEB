import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LogOut, Moon } from 'lucide-react';
import React, { cloneElement } from 'react';
import { WeatherWidget } from '../widgets/WeatherWidget';
import { CalendarWidget } from '../widgets/CalendarWidget';
import { TrelloWidget } from '../widgets/TrelloWidget';
import { MusicWidget } from '../widgets/MusicWidget';
import { QuoteWidget } from '../widgets/QuoteWidget';
import { JokeWidget } from '../widgets/JokeWidget';
import { MoviesWidget } from '../widgets/MoviesWidget';
import { AssistantWidget } from '../widgets/AssistantWidget';
import { useLocalStorage } from '../hooks/useLocalStorage';

const widgets = {
  weather: WeatherWidget,
  calendar: CalendarWidget,
  trello: TrelloWidget,
  music: MusicWidget,
  quote: QuoteWidget,
  joke: JokeWidget,
  movies: MoviesWidget
};

const defaultOrder = ['weather', 'quote', 'joke', 'movies', 'calendar', 'music', 'trello'];
const widgetSpans = {
  calendar: 'lg:col-span-2',
  music: 'lg:col-span-2',
  trello: 'lg:col-span-2'
};

export function DashboardPage({ onLogout }) {
  const [order, setOrder] = useLocalStorage('life:widget-order', defaultOrder);

  function onDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((items) => arrayMove(items, items.indexOf(active.id), items.indexOf(over.id)));
  }

  return (
    <main className="life-bg min-h-screen px-4 py-5 text-slate-100 md:px-8">
      <header className="mx-auto mb-6 flex max-w-7xl items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">Private Homepage</p>
          <h1 className="text-3xl font-black text-white md:text-5xl">Life Dashboard</h1>
        </div>
        <button className="icon-soft h-11 w-11" onClick={onLogout} aria-label="Logout"><LogOut className="h-5 w-5" /></button>
      </header>

      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
          <Moon className="h-4 w-4 text-cyan-300" />
          Dark Mode ist dauerhaft aktiv. Widgets kannst du per `::` Griff verschieben.
        </div>
        <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={order} strategy={rectSortingStrategy}>
            <div className="grid gap-4 lg:grid-cols-3">
              {order.map((id) => {
                const Widget = widgets[id];
                return <SortableWidget className={widgetSpans[id]} id={id} key={id}><Widget /></SortableWidget>;
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>
      <AssistantWidget />
    </main>
  );
}

function SortableWidget({ id, className = '', children }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return (
    <div className={className} ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
      {cloneElement(children, { dragHandleProps: { ...attributes, ...listeners } })}
    </div>
  );
}
