const { db } = require('../services/jsonDatabase');
const { validateRequired, validateNumber } = require('../utils/validators');

const expenseController = {
  // Get all expenses
  async getAllExpenses(req, res, next) {
    try {
      const expenses = await db.readTable('expenses');
      expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
      res.json({ success: true, data: expenses });
    } catch (error) {
      next(error);
    }
  },

  // Get single expense
  async getExpense(req, res, next) {
    try {
      const expense = await db.findById('expenses', req.params.id);
      if (!expense) {
        return res.status(404).json({ message: 'Expense not found' });
      }
      res.json({ success: true, data: expense });
    } catch (error) {
      next(error);
    }
  },

  // Create expense
  async createExpense(req, res, next) {
    try {
      const { category, description, amount, paymentMethod, date } = req.body;
      
      validateRequired(category, 'Category');
      validateRequired(description, 'Description');
      validateNumber(amount, 'Amount');
      
      const expense = await db.create('expenses', {
        category,
        description,
        amount: parseFloat(amount),
        paymentMethod: paymentMethod || 'cash',
        date: date || new Date().toISOString().split('T')[0],
        createdBy: req.userId
      });
      
      res.status(201).json({
        success: true,
        data: expense,
        message: 'Expense created successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Update expense
  async updateExpense(req, res, next) {
    try {
      const expense = await db.update('expenses', req.params.id, req.body);
      if (!expense) {
        return res.status(404).json({ message: 'Expense not found' });
      }
      res.json({
        success: true,
        data: expense,
        message: 'Expense updated successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Update expense status
  async updateExpenseStatus(req, res, next) {
    try {
      const { status } = req.body;
      const expense = await db.update('expenses', req.params.id, { status });
      if (!expense) {
        return res.status(404).json({ message: 'Expense not found' });
      }
      res.json({
        success: true,
        data: expense,
        message: 'Expense status updated successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Delete expense
  async deleteExpense(req, res, next) {
    try {
      const expense = await db.findById('expenses', req.params.id);
      if (!expense) {
        return res.status(404).json({ message: 'Expense not found' });
      }
      await db.delete('expenses', req.params.id);
      res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  // Get expense categories
  async getExpenseCategories(req, res, next) {
    try {
      const categories = [
        'rent', 'utilities', 'salaries', 'supplies', 
        'maintenance', 'marketing', 'insurance', 'taxes', 'other'
      ];
      res.json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  },

  // Get expenses by category
  async getExpensesByCategory(req, res, next) {
    try {
      const expenses = await db.find('expenses', { category: req.params.category });
      res.json({ success: true, data: expenses });
    } catch (error) {
      next(error);
    }
  },

  // Get expenses by date range
  async getExpensesByDateRange(req, res, next) {
    try {
      const { start, end } = req.query;
      const expenses = await db.readTable('expenses');
      
      const filteredExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return (!start || expenseDate >= new Date(start)) && 
               (!end || expenseDate <= new Date(end));
      });
      
      res.json({ success: true, data: filteredExpenses });
    } catch (error) {
      next(error);
    }
  },

  // Search expenses
  async searchExpenses(req, res, next) {
    try {
      const { q } = req.query;
      const expenses = await db.readTable('expenses');
      
      const results = expenses.filter(expense =>
        expense.description.toLowerCase().includes(q.toLowerCase()) ||
        expense.category.toLowerCase().includes(q.toLowerCase())
      );
      
      res.json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  },

  // Get expense report
  async getExpenseReport(req, res, next) {
    try {
      const { start, end } = req.query;
      const expenses = await db.readTable('expenses');
      
      const filteredExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return (!start || expenseDate >= new Date(start)) && 
               (!end || expenseDate <= new Date(end));
      });
      
      const total = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      // Group by category
      const byCategory = {};
      filteredExpenses.forEach(expense => {
        if (!byCategory[expense.category]) {
          byCategory[expense.category] = 0;
        }
        byCategory[expense.category] += expense.amount;
      });
      
      res.json({
        success: true,
        data: {
          count: filteredExpenses.length,
          total,
          byCategory
        }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = expenseController;