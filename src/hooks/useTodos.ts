// Allowed category options for todos (must match DB constraint exactly)
export const CATEGORY_OPTIONS = [
  'Study Session',
  'Assignment',
  'Test/Exam',
  'Project',
  'Tutoring',
  'Personal'
] as const;

export type TodoCategory = typeof CATEGORY_OPTIONS[number];

// Helper for forms: use CATEGORY_OPTIONS for dropdown/select
// Example usage in a form:
// <select ...>
//   {CATEGORY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
// </select>

// Helper to validate category
export function isValidCategory(category: string): category is TodoCategory {
  return CATEGORY_OPTIONS.includes(category as TodoCategory);
}
import { useState, useEffect } from 'react';
import { isToday, isBefore, startOfDay } from "date-fns";
import { supabase } from '../utils/supabase/client';

type TodoStatus = 'Overdue' | 'Today' | 'Upcoming' | 'Completed';

export interface TodoItem {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  category: TodoCategory;
  dueDate?: Date;
  is_completed: boolean;
  user_id: string;
}



export function useTodos(userId: string) {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Load todos from Supabase
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    supabase
      .from('todos')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          setTodos(
            data.map((todo: any) => ({
              id: todo.id,
              title: todo.title,
              priority: todo.priority,
              category: todo.category,
              dueDate: todo.due_date ? new Date(todo.due_date) : undefined,
              is_completed: todo.is_completed,
              user_id: todo.user_id,
            }))
          );
        }
        setLoading(false);
      });
  }, [userId]);

  const addTodo = async (todoData: Omit<TodoItem, 'id' | 'is_completed'>) => {
    if (!userId) return;
    // Validate category before insert
    if (!CATEGORY_OPTIONS.includes(todoData.category)) {
      throw new Error('Invalid category value');
    }
    const { data, error } = await supabase
      .from('todos')
      .insert([
        {
          user_id: userId,
          title: todoData.title,
          priority: todoData.priority,
          category: todoData.category,
          due_date: todoData.dueDate ? todoData.dueDate.toISOString().slice(0, 10) : null,
          is_completed: false,
        }
      ])
      .select();
    if (!error && data && data[0]) {
      setTodos(prev => [
        {
          id: data[0].id,
          title: data[0].title,
          priority: data[0].priority,
          category: data[0].category,
          dueDate: data[0].due_date ? new Date(data[0].due_date) : undefined,
          is_completed: data[0].is_completed,
          user_id: data[0].user_id,
        },
        ...prev
      ]);
    }
  };

  const toggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    const { data, error } = await supabase
      .from('todos')
      .update({ is_completed: !todo.is_completed })
      .eq('id', id)
      .select();
    if (!error && data && data[0]) {
      setTodos(prev => prev.map(t => t.id === id ? { ...t, is_completed: !t.is_completed } : t));
    }
  };

  const deleteTodo = async (id: string) => {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id);
    if (!error) {
      setTodos(prev => prev.filter(todo => todo.id !== id));
    }
  };

  const updateTodo = async (id: string, updates: Partial<TodoItem>) => {
    const { data, error } = await supabase
      .from('todos')
      .update({
        ...updates,
        due_date: updates.dueDate ? updates.dueDate.toISOString().slice(0, 10) : undefined
      })
      .eq('id', id)
      .select();
    if (!error && data && data[0]) {
      setTodos(prev => prev.map(todo => todo.id === id ? { ...todo, ...updates } : todo));
    }
  };

  const getTodaysTodos = () => {
    const today = startOfDay(new Date());
    return todos
      .map(todo => {
        if (!todo.dueDate) return { ...todo, status: 'Upcoming' as TodoStatus };
        const due = startOfDay(todo.dueDate);
        let status: TodoStatus = 'Upcoming';
        if (!todo.is_completed) {
          if (due < today) status = 'Overdue';
          else if (due.getTime() === today.getTime()) status = 'Today';
          else status = 'Upcoming';
        } else {
          status = 'Completed';
        }
        return { ...todo, status };
      })
      .filter(todo => todo.status === 'Overdue' || todo.status === 'Today')
      .sort((a, b) => {
        const order: Record<TodoStatus, number> = { Overdue: 0, Today: 1, Upcoming: 2, Completed: 3 };
        return order[a.status] - order[b.status];
      });
  };

  const priorityOrder: Record<'high' | 'medium' | 'low', number> = {
    high: 0,
    medium: 1,
    low: 2
  };

  const getFilteredTodos = (filter: string) => {
    const now = startOfDay(new Date());
    return todos
      .map(todo => {
        const due = todo.dueDate ? startOfDay(todo.dueDate) : now;
        let status: TodoStatus = 'Upcoming';
        if (!todo.is_completed) {
          if (isBefore(due, now)) status = 'Overdue';
          else if (due.getTime() === now.getTime()) status = 'Today';
          else status = 'Upcoming';
        } else {
          status = 'Completed';
        }
        return { ...todo, status };
      })
      .filter(todo => {
        if (filter === 'all') return true;
        if (filter === 'pending') return !todo.is_completed;
        if (filter === 'completed') return todo.is_completed;
        if (filter === 'today') return todo.status === 'Today';
        if (filter === 'overdue') return todo.status === 'Overdue';
        return true;
      })
      .sort((a, b) => {
        // First: sort by status
        const statusOrder: Record<TodoStatus, number> = { Overdue: 0, Today: 1, Upcoming: 2, Completed: 3 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status];
        }
        // Then: sort by priority within same status
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  };

  const getStats = () => {
    const total = todos.length;
    const completed = todos.filter(t => t.is_completed).length;
    const pending = total - completed;
    const overdue = todos.filter(t =>
      t.dueDate
        ? !t.is_completed && isBefore(new Date(t.dueDate), startOfDay(new Date()))
        : false
    ).length;
    return { total, completed, pending, overdue };
  };

  return {
    todos,
    addTodo,
    toggleTodo,
    deleteTodo,
    updateTodo,
    getTodaysTodos,
    getFilteredTodos,
    getStats,
    loading
  };
}