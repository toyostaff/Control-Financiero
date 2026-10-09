
import { supabase } from "../lib/supabase";

const toNumber = (value) => Number(value ?? 0);

const mapAccount = (item) => ({
  id: item.id,
  name: item.name,
  type: item.type,
  balance: toNumber(item.balance),
  active: item.active,
});

const mapCategory = (item) => ({
  id: item.id,
  name: item.name,
  type: item.type,
  active: item.active,
});

const mapTransaction = (item, accountNames) => ({
  id: item.id,
  description: item.description,
  amount: toNumber(item.amount),
  category: item.category,
  accountId: item.account_id,
  account: accountNames.get(item.account_id) || "",
  date: item.date,
  type: item.type,
  createdAt: item.created_at,
});

const mapBudget = (item) => ({
  id: item.id,
  category: item.category,
  limit: toNumber(item.limit),
});

const mapDebt = (item) => ({
  id: item.id,
  name: item.name,
  type: item.type,
  initialAmount: toNumber(item.initial_amount),
  balance: toNumber(item.balance),
  monthlyPayment: toNumber(item.monthly_payment),
  dueDay: item.due_day,
  singlePayment: item.single_payment,
  mode: item.mode,
  createdAt: item.created_at,
});

const mapDebtPayment = (item) => ({
  id: item.id,
  debtId: item.debt_id,
  debtName: item.debt_name,
  accountId: item.account_id,
  accountName: item.account_name,
  amount: toNumber(item.amount),
  principal: toNumber(item.principal),
  interest: toNumber(item.interest),
  date: item.date,
  mode: item.mode,
  createdAt: item.created_at,
});

const mapGoal = (item) => ({
  id: item.id,
  name: item.name,
  target: toNumber(item.target),
  saved: toNumber(item.saved),
  achieved: toNumber(item.saved) >= toNumber(item.target),
  deadline: item.deadline,
});

const mapSavingsMovement = (item) => ({
  id: item.id,
  goalId: item.goal_id,
  goalName: item.goal_name,
  accountId: item.account_id,
  accountName: item.account_name,
  type: item.type,
  amount: toNumber(item.amount),
  description: item.description,
  category: item.category,
  date: item.date,
  createdAt: item.created_at,
});

async function getAuthenticatedUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error(
      "Tu sesión no está disponible. Inicia sesión nuevamente."
    );
  }

  return user;
}

async function readTable(table, userId, columns = "*") {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .eq("user_id", userId);

  if (error) {
    throw new Error(
      `Error al consultar ${table}: ${error.message}`
    );
  }

  return data ?? [];
}

export async function getFinancialData() {
  const user = await getAuthenticatedUser();

  const [
    accounts,
    categories,
    transactions,
    budgets,
    debts,
    debtPayments,
    goals,
    savingsMovements,
  ] = await Promise.all([
    readTable("accounts", user.id),
    readTable("categories", user.id),
    readTable("transactions", user.id),
    readTable("budgets", user.id),
    readTable("debts", user.id),
    readTable("debt_payments", user.id),
    readTable("savings_goals", user.id),
    readTable("savings_movements", user.id),
  ]);

  const accountNames = new Map(
    accounts.map((account) => [
      account.id,
      account.name,
    ])
  );

  const realDebts = debts.filter(
    (debt) => debt.mode === "real"
  );

  const testDebts = debts.filter(
    (debt) => debt.mode === "test"
  );

  const realDebtPayments = debtPayments.filter(
    (payment) => payment.mode === "real"
  );

  const testDebtPayments = debtPayments.filter(
    (payment) => payment.mode === "test"
  );

  return {
    userId: user.id,

    accounts: accounts.map(mapAccount),
    categories: categories.map(mapCategory),

    transactions: transactions
      .map((item) =>
        mapTransaction(item, accountNames)
      )
      .sort((a, b) =>
        b.date.localeCompare(a.date)
      ),

    budgets: budgets.map(mapBudget),

    debts: realDebts.map(mapDebt),

    debtPayments: realDebtPayments.map(
      mapDebtPayment
    ),

    testDebts: testDebts.map(mapDebt),

    testDebtPayments: testDebtPayments.map(
      mapDebtPayment
    ),

    goals: goals.map(mapGoal),

    savingsMovements: savingsMovements.map(
      mapSavingsMovement
    ),
  };
}


