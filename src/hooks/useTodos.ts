import { useState, useEffect } from 'react';
import { isToday, isBefore, startOfDay } from "date-fns";

type TodoStatus = 'Overdue' | 'Today' | 'Upcoming' | 'Completed';

export interface TodoItem {
  id: string;
  title: string;
  description: string;
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
        ...todo,
        dueDate: todo.dueDate ? new Date(todo.dueDate) : undefined,
        createdAt: new Date(todo.createdAt),
        // Remove old estimatedTime field if it exists
        estimatedTime: undefined
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
          description: 'Solve Chapter 5 exercises',
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
          description: 'Go through organic chemistry concepts',
          completed: true,
          priority: 'medium',
          category: 'study',
          createdAt: new Date(Date.now() - 86400000), // Yesterday
          relatedSubject: 'Chemistry'
        },
        {
          id: '3',
          title: 'Prepare for Physics test',
          description: 'Study kinematics and dynamics',
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
  
  const getFilteredTodos = (filter: string) => {
    const now = startOfDay(new Date());

    return todos
      .map(todo => {
        const due = todo.dueDate ? startOfDay(todo.dueDate) : now; // default today
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
        const order: Record<TodoStatus, number> = { Overdue: 0, Today: 1, Upcoming: 2, Completed: 3 };
        return order[a.status] - order[b.status];
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