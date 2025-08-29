import { useState, useEffect } from 'react';
import { isToday, isBefore, startOfDay } from "date-fns";

type TodoStatus = 'Overdue' | 'Today' | 'Upcoming' | 'Completed';

export interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  category: 'study' | 'assignment' | 'test' | 'project' | 'tutoring' | 'personal';
  dueDate?: Date;
  createdAt: Date;
  relatedSubject?: string;
}

export function useTodos(userEmail: string) {
  const [todos, setTodos] = useState<TodoItem[]>([]);

  // Load todos from localStorage
  useEffect(() => {
    const savedTodos = localStorage.getItem(`todos_${userEmail}`);
    if (savedTodos) {
      const parsedTodos = JSON.parse(savedTodos).map((todo: any) => ({
        id: todo.id,
        title: todo.title,
        completed: todo.completed,
        priority: todo.priority,
        category: todo.category,
        dueDate: todo.dueDate ? new Date(todo.dueDate) : undefined,
        createdAt: new Date(todo.createdAt),
        relatedSubject: todo.relatedSubject
      }));
      setTodos(parsedTodos);
      // Save cleaned version back to localStorage
      localStorage.setItem(`todos_${userEmail}`, JSON.stringify(parsedTodos));
    } else {
      // Initialize with sample todos if none exist
      const sampleTodos: TodoItem[] = [
        {
          id: '1',
          title: 'Complete Math homework',
          completed: false,
          priority: 'high',
          category: 'assignment',
          dueDate: new Date(Date.now() + 86400000),
          createdAt: new Date(),
          relatedSubject: 'Mathematics'
        },
        {
          id: '2',
          title: 'Review Chemistry notes',
          completed: true,
          priority: 'medium',
          category: 'study',
          dueDate: new Date(),
          createdAt: new Date(), 
          relatedSubject: 'Chemistry'
        },
        {
          id: '3',
          title: 'Prepare for Physics test',
          completed: false,
          priority: 'high',
          category: 'test',
          dueDate: new Date(Date.now() + 2 * 86400000), // Day after tomorrow
          createdAt: new Date(),
          relatedSubject: 'Physics'
        }
      ];
      setTodos(sampleTodos);
      localStorage.setItem(`todos_${userEmail}`, JSON.stringify(sampleTodos));
    }
  }, [userEmail]);

  // Save todos to localStorage whenever todos change
  useEffect(() => {
    localStorage.setItem(`todos_${userEmail}`, JSON.stringify(todos));
  }, [todos, userEmail]);

  const addTodo = (todoData: Omit<TodoItem, 'id' | 'createdAt' | 'completed'>) => {
    const newTodo: TodoItem = {
      ...todoData,
      id: Date.now().toString(),
      completed: false,
      createdAt: new Date(),
      dueDate: todoData.dueDate ?? startOfDay(new Date()) // default to today
    };
    setTodos(prev => [newTodo, ...prev]);
    return newTodo;
  };

  const toggleTodo = (id: string) => {
    setTodos(prev => prev.map(todo => 
      todo.id === id 
        ? { ...todo, completed: !todo.completed }
        : todo
    ));
  };

  const deleteTodo = (id: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== id));
  };

  const updateTodo = (id: string, updates: Partial<TodoItem>) => {
    setTodos(prev => prev.map(todo => 
      todo.id === id 
        ? { ...todo, ...updates }
        : todo
    ));
  };

  const getTodaysTodos = () => {
    const today = startOfDay(new Date());

    return todos
      .map(todo => {
        if (!todo.dueDate) return { ...todo, status: 'Upcoming' as TodoStatus };

        const due = startOfDay(todo.dueDate);
        let status: TodoStatus = 'Upcoming';

        if (!todo.completed) {
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

        if (!todo.completed) {
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
        if (filter === 'pending') return !todo.completed;
        if (filter === 'completed') return todo.completed;
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
    const completed = todos.filter(t => t.completed).length;
    const pending = total - completed;
    const overdue = todos.filter(t =>
      t.dueDate
        ? !t.completed && isBefore(new Date(t.dueDate), startOfDay(new Date()))
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
    getStats
  };
}