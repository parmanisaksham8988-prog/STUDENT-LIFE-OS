import TaskManager from "../components/TaskManager";

function Tasks({ addToast, onUpdate }) {
  return (
    <div>
      <TaskManager addToast={addToast} onUpdate={onUpdate} />
    </div>
  );
}

export default Tasks;
