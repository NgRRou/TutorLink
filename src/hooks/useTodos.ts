import { useState, useEffect } from 'react';

export interface TodoItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  category: 'study' | 'assignment' | 'test' | 'project' | 'tutoring' | 'personal';
  dueDate?: Date;
  createdAt: Date;
  estimatedTime?: number; // in minutes
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
        createdAt: new Date(todo.createdAt)
      }));
      setTodos(parsedTodos);
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
          dueDate: new Date(Date.now() + 86400000), // Tomorrow
          createdAt: new Date(),
          estimatedTime: 60,
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
          estimatedTime: 30,
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
          estimatedTime: 90,
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
      createdAt: new Date()
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return todos.filter(todo => {
      if (todo.dueDate) {
        const dueDate = new Date(todo.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === today.getTime();
      }
      return false;
    }).slice(0, 3); // Show only first 3 for dashboard
  };

  const getFilteredTodos = (filter: 'all' | 'pending' | 'completed' | 'today' | 'overdue') => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return todos.filter(todo => {
      switch (filter) {
        case 'pending':
          return !todo.completed;
        case 'completed':
          return todo.completed;
        case 'today':
          return todo.dueDate && new Date(todo.dueDate).toDateString() === today.toDateString();
        case 'overdue':
          return todo.dueDate && !todo.completed && new Date(todo.dueDate) < now;
        default:
          return true;
      }
    });
  };

  const getStats = () => {
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    const pending = total - completed;
    const overdue = todos.filter(t => 
      t.dueDate && !t.completed && new Date(t.dueDate) < new Date()
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