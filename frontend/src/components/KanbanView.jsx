import { useState } from "react";
import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { api } from "../lib/api";

const COLUMNS = ["Not Started", "In Progress", "On Hold", "Complete", "Cancelled"];

function Card({ item }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: item.activityId, data: item });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 999 } : undefined;

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className="card p-2 mb-2 shadow-sm border-0" style={{ cursor: "grab", ...style }}>
      <div className="fw-bold" style={{ fontSize: "0.85rem" }}>{item.title}</div>
      <div className="text-muted" style={{ fontSize: "0.75rem" }}>{item.activityId}</div>
    </div>
  );
}

function Column({ id, items }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="bg-light rounded p-2 flex-grow-1" style={{ minWidth: 200, minHeight: 400 }}>
      <h6 className="fw-bold text-muted mb-3">{id} ({items.length})</h6>
      {items.map((item) => <Card key={item.activityId} item={item} />)}
    </div>
  );
}

export default function KanbanView({ activities, onUpdate }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;

    const activityId = active.id;
    const newStatus = over.id;
    const activity = activities.find((a) => a.activityId === activityId);

    if (activity && activity.status !== newStatus) {
      try {
        await api.put(`/activities/${activityId}`, { status: newStatus });
        onUpdate();
      } catch (e) { alert(e.message); }
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="d-flex gap-3 overflow-auto pb-3">
        {COLUMNS.map((col) => (
          <Column key={col} id={col} items={activities.filter((a) => a.status === col)} />
        ))}
      </div>
    </DndContext>
  );
}