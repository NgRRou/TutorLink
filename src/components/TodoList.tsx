import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { toast } from "sonner@2.0.3";
import { useTodos, type TodoItem } from "../hooks/useTodos";
import { 
  CheckSquare, 
  Plus, 
  Calendar as CalendarIcon,
  Clock,
  Tag,
  Star,
  Trash2,
  Edit,
  Target,
  TrendingUp,
  Book,
  Brain,
  Users,
  Zap
} from "lucide-react";
import { format } from "date-fns";

interface TodoListProps {
  user: any;
}

export function TodoList({ user }: TodoListProps) {
  const { todos, addTodo, toggleTodo, deleteTodo, getFilteredTodos, getStats } = useTodos(user.email);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // normalize to start of today

  const [newTodo, setNewTodo] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    category: 'study' as const,
    dueDate: today,
    relatedSubject: ''
  });

  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'today' | 'overdue'>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const categories = [
    { value: 'study', label: 'Study Session', icon: Book, color: 'bg-blue-100 text-blue-700' },
    { value: 'assignment', label: 'Assignment', icon: Edit, color: 'bg-green-100 text-green-700' },
    { value: 'test', label: 'Test/Exam', icon: Brain, color: 'bg-red-100 text-red-700' },
    { value: 'project', label: 'Project', icon: Target, color: 'bg-purple-100 text-purple-700' },
    { value: 'tutoring', label: 'Tutoring', icon: Users, color: 'bg-orange-100 text-orange-700' },
    { value: 'personal', label: 'Personal', icon: Star, color: 'bg-gray-100 text-gray-700' }
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-700' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'high', label: 'High', color: 'bg-red-100 text-red-700' }
  ];

  const handleAddTodo = () => {
    if (!newTodo.title.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    addTodo({
      title: newTodo.title,
      description: newTodo.description,
      priority: newTodo.priority,
      category: newTodo.category,
      dueDate: newTodo.dueDate ?? new Date(),
      relatedSubject: newTodo.relatedSubject
    });

    setNewTodo({
      title: '',
      description: '',
      priority: 'medium',
      category: 'study',
      dueDate: new Date(),
      relatedSubject: ''
    });
    setIsAddDialogOpen(false);
    toast.success('Task added successfully!');
  };

  const handleDeleteTodo = (id: string) => {
    deleteTodo(id);
    toast.success('Task deleted');
  };

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.value === category);
    return cat ? cat.icon : Book;
  };

  const getCategoryColor = (category: string) => {
    const cat = categories.find(c => c.value === category);
    return cat ? cat.color : 'bg-gray-100 text-gray-700';
  };

  const getPriorityColor = (priority: string) => {
    const prio = priorities.find(p => p.value === priority);
    return prio ? prio.color : 'bg-gray-100 text-gray-700';
  };

  const isOverdue = (todo: TodoItem) => {
    return todo.dueDate && !todo.completed && new Date(todo.dueDate) < new Date();
  };

  const priorityOrder: Record<'high' | 'medium' | 'low', number> = {
    high: 0,
    medium: 1,
    low: 2
  };

  const stats = getStats();
  const filteredTodos = getFilteredTodos(filter).sort((a, b) => {
    // First: sort by status
    const statusOrder: Record<string, number> = { Overdue: 0, Today: 1, Upcoming: 2, Completed: 3 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    // Then: sort by priority within same status
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckSquare className="h-6 w-6 text-blue-600" />
            <span>To-Do List & Task Manager</span>
          </CardTitle>
          <CardDescription>
            Organize your study tasks, assignments, and goals efficiently
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-blue-700">Total Tasks</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-green-700">Completed</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-yellow-700">Pending</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
              <div className="text-sm text-red-700">Overdue</div>
            </div>
          </div>

          {/* Filters and Add Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 sm:space-x-4">
            <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="today">Due Today</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Task</DialogTitle>
                  <DialogDescription>
                    Create a new task to help organize your studies
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Task Title</Label>
                    <Input
                      id="title"
                      value={newTodo.title}
                      onChange={(e) => setNewTodo(prev => ({ ...prev, title: e.target.value }))}
                      
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Category</Label>
                      <Select 
                        value={newTodo.category} 
                        onValueChange={(value: any) => setNewTodo(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Priority</Label>
                      <Select 
                        value={newTodo.priority} 
                        onValueChange={(value: any) => setNewTodo(prev => ({ ...prev, priority: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {priorities.map(prio => (
                            <SelectItem key={prio.value} value={prio.value}>
                              {prio.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newTodo.dueDate ? format(newTodo.dueDate, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={newTodo.dueDate}
                          onSelect={(date) => setNewTodo(prev => ({ ...prev, dueDate: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="flex space-x-2">
                    <Button onClick={handleAddTodo} className="flex-1">
                      Add Task
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsAddDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Tasks ({filteredTodos.length})</span>
            <Badge variant="outline">
              Filter: {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTodos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tasks found</p>
              <p className="text-sm">Add your first task to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTodos.map((todo) => {
                const CategoryIcon = getCategoryIcon(todo.category);

                // Determine background for overdue
                const bgClass =
                  todo.status === 'Overdue'
                    ? 'border-red-200 bg-red-50'
                    : todo.completed
                    ? 'bg-gray-200'
                    : '';

                return (
                  <div
                    key={todo.id}
                    className={`flex items-start space-x-3 p-4 border rounded-lg transition-all hover:shadow-sm ${bgClass}`}
                  >
                    <Checkbox
                      checked={todo.completed}
                      onCheckedChange={() => toggleTodo(todo.id)}
                      className="mt-1"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4
                          className={`font-medium ${
                            todo.completed ? 'line-through text-muted-foreground' : ''
                          }`}
                        >
                          {todo.title}
                        </h4>

                        {/* Status Badge */}
                        {todo.status && (
                          <Badge
                            variant="outline"
                            className={`
                              text-xs 
                              ${todo.status === 'Overdue' ? 'bg-red-100 text-red-700' : ''}
                              ${todo.status === 'Today' ? 'bg-blue-50 border-blue-200 font-bold' : ''}
                              ${todo.status === 'Upcoming' ? 'bg-green-100 text-green-700' : ''}
                              ${todo.status === 'Completed' ? 'bg-gray-100 text-gray-500' : ''}
                            `}
                          >
                            {todo.status}
                          </Badge>
                        )}
                      </div>

                      {todo.description && (
                        <p
                          className={`text-sm text-muted-foreground mb-2 ${
                            todo.completed ? 'line-through' : ''
                          }`}
                        >
                          {todo.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="text-xs bg-white border border-gray-200 text-gray-700">
                          <CategoryIcon className="h-3 w-3 mr-1" />
                          {categories.find((c) => c.value === todo.category)?.label}
                        </Badge>

                        <Badge
                          variant="outline"
                          className={`text-xs ${getPriorityColor(todo.priority)}`}
                        >
                          {todo.priority} priority
                        </Badge>

                        {todo.dueDate && (
                          <div className="flex items-center text-xs text-muted-foreground">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {format(todo.dueDate, 'MMM d')}
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTodo(todo.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Productivity Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-yellow-600" />
            <span>Productivity Tips</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-700 mb-2">🎯 Prioritize Tasks</h4>
              <p className="text-sm text-blue-600">
                Focus on high-priority items first. Use the priority system to organize your workload effectively.
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-700 mb-2">⏰ Time Blocking</h4>
              <p className="text-sm text-green-600">
                Estimate time for each task and block calendar time for focused work sessions.
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-700 mb-2">📚 Break Down Large Tasks</h4>
              <p className="text-sm text-purple-600">
                Split big projects into smaller, manageable tasks to maintain momentum and track progress.
              </p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <h4 className="font-medium text-orange-700 mb-2">🏆 Celebrate Wins</h4>
              <p className="text-sm text-orange-600">
                Check off completed tasks and acknowledge your achievements to stay motivated.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}