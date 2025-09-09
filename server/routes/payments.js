const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

module.exports = () => {
  const paymentsFile = path.join(__dirname, '../../data/pagamentos.json');
  const usersFile = path.join(__dirname, '../../data/usuarios.json');

  /**
   * GET /api/payments/unpaid - Get all unpaid balances for workers
   */
  router.get('/unpaid', async (req, res) => {
    try {
      // Load payments data
      let paymentsData;
      try {
        const data = await fs.readFile(paymentsFile, 'utf8');
        paymentsData = JSON.parse(data);
      } catch (error) {
        paymentsData = { pagamentos: [] };
      }

      // Load users data to get worker names
      let usersData;
      try {
        const data = await fs.readFile(usersFile, 'utf8');
        usersData = JSON.parse(data);
      } catch (error) {
        usersData = { usuarios: {} };
      }

      // Calculate unpaid balances per worker
      const unpaidBalances = {};
      
      // Process all payments
      paymentsData.pagamentos.forEach(payment => {
        if (!payment.pago && payment.valor > 0) {
          const userId = payment.usuario_id;
          if (!unpaidBalances[userId]) {
            unpaidBalances[userId] = {
              usuario_id: userId,
              nome: usersData.usuarios[userId]?.nome || `Usuário ${userId}`,
              total_pendente: 0,
              servicos: [],
              ultimo_servico: null
            };
          }
          
          unpaidBalances[userId].total_pendente += payment.valor;
          unpaidBalances[userId].servicos.push({
            tipo: payment.tipo_servico,
            valor: payment.valor,
            data: payment.data_calculo || payment.timestamp
          });
          
          // Track most recent service
          const serviceDate = payment.data_calculo || payment.timestamp;
          if (!unpaidBalances[userId].ultimo_servico || serviceDate > unpaidBalances[userId].ultimo_servico) {
            unpaidBalances[userId].ultimo_servico = serviceDate;
          }
        }
      });

      res.json({
        success: true,
        unpaid_balances: unpaidBalances,
        total_unpaid: Object.values(unpaidBalances).reduce((sum, worker) => sum + worker.total_pendente, 0)
      });

    } catch (error) {
      console.error('Error calculating unpaid balances:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to calculate unpaid balances' 
      });
    }
  });

  /**
   * GET /api/payments/worker/:workerId - Get payment details for specific worker
   */
  router.get('/worker/:workerId', async (req, res) => {
    try {
      const workerId = req.params.workerId;
      
      // Load payments data
      let paymentsData;
      try {
        const data = await fs.readFile(paymentsFile, 'utf8');
        paymentsData = JSON.parse(data);
      } catch (error) {
        paymentsData = { pagamentos: [] };
      }

      // Filter payments for this worker
      const workerPayments = paymentsData.pagamentos.filter(p => p.usuario_id === workerId);
      
      // Separate paid and unpaid
      const unpaidPayments = workerPayments.filter(p => !p.pago);
      const paidPayments = workerPayments.filter(p => p.pago);
      
      // Calculate totals
      const totalUnpaid = unpaidPayments.reduce((sum, p) => sum + (p.valor || 0), 0);
      const totalPaid = paidPayments.reduce((sum, p) => sum + (p.valor || 0), 0);

      res.json({
        success: true,
        worker_id: workerId,
        unpaid: {
          payments: unpaidPayments,
          total: totalUnpaid
        },
        paid: {
          payments: paidPayments,
          total: totalPaid
        },
        grand_total: totalUnpaid + totalPaid
      });

    } catch (error) {
      console.error('Error getting worker payments:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get worker payments' 
      });
    }
  });

  /**
   * POST /api/payments/mark-paid - Mark payments as paid
   */
  router.post('/mark-paid', async (req, res) => {
    try {
      const { payment_ids, worker_id } = req.body;
      
      // Load payments data
      let paymentsData;
      try {
        const data = await fs.readFile(paymentsFile, 'utf8');
        paymentsData = JSON.parse(data);
      } catch (error) {
        paymentsData = { pagamentos: [] };
      }

      let markedCount = 0;
      const paidDate = new Date().toISOString();

      // Mark specific payments as paid
      if (payment_ids && Array.isArray(payment_ids)) {
        paymentsData.pagamentos.forEach(payment => {
          if (payment_ids.includes(payment.id)) {
            payment.pago = true;
            payment.data_pagamento = paidDate;
            markedCount++;
          }
        });
      } 
      // Mark all unpaid payments for a worker as paid
      else if (worker_id) {
        paymentsData.pagamentos.forEach(payment => {
          if (payment.usuario_id === worker_id && !payment.pago) {
            payment.pago = true;
            payment.data_pagamento = paidDate;
            markedCount++;
          }
        });
      }

      // Save updated data
      await fs.writeFile(paymentsFile, JSON.stringify(paymentsData, null, 2));

      res.json({
        success: true,
        message: `${markedCount} payment(s) marked as paid`,
        marked_count: markedCount
      });

    } catch (error) {
      console.error('Error marking payments as paid:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to mark payments as paid' 
      });
    }
  });

  return router;
};