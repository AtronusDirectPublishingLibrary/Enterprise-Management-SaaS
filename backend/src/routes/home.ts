import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { currentPlans } from "../lib/currentPlans";
import { canManagePayroll } from "../lib/payrollAccess";

const router = Router();
router.use(requireAuth);

function canVerify(user: { role?: string; position?: string | null }) {
  return (
    user.role === "admin" ||
    user.role === "executive" ||
    user.position === "Strategy and Planning Officer"
  );
}

/** Live, role-aware briefing data for the signed-in person's home page. */
router.get("/briefing", async (req: any, res, next) => {
  try {
    const user = req.user!;
    const current = await currentPlans();
    const planIds = Object.values(current)
      .map((plan) => plan?.id)
      .filter((id): id is string => Boolean(id));
    const verify = canVerify(user);
    const payrollManager = canManagePayroll(user);
    const now = new Date();

    const [pendingVerification, myApprovals, myPlans, overdueMilestones, pendingSalary, openTasks, unread, lastVerified] =
      await Promise.all([
        verify
          ? prisma.progressUpdate.count({
              where: { planId: { in: planIds }, status: "Submitted" },
            })
          : Promise.resolve(0),
        Promise.all([
          prisma.leaveRequest.count({ where: { supervisorId: user.sub, status: "PENDING" } }),
          prisma.annualLeavePlan.count({ where: { supervisorId: user.sub, status: "SUBMITTED" } }),
        ]).then(([leaves, plans]) => leaves + plans),
        prisma.annualLeavePlan.count({ where: { userId: user.sub, status: "SUBMITTED" } }),
        prisma.planItem.count({
          where: {
            planId: { in: planIds },
            kind: "MILESTONE",
            status: { not: "Completed" },
            endDate: { lt: now },
          },
        }),
        payrollManager
          ? prisma.salaryRecord.count({ where: { approvalStatus: "Pending" } })
          : Promise.resolve(0),
        prisma.staffTask.count({ where: { userId: user.sub, status: "OPEN" } }),
        prisma.notification.count({ where: { recipient: user.username, read: false } }),
        prisma.progressUpdate.aggregate({
          where: { planId: { in: planIds }, status: "Verified" },
          _max: { reviewedAt: true },
        }),
      ]);

    const actions = [
      {
        key: "verification",
        label: "Updates awaiting verification",
        count: pendingVerification,
        path: "/progress-updates",
        tone: "gold",
      },
      {
        key: "approvals",
        label: "Approvals waiting for you",
        count: myApprovals,
        path: "/my-approvals",
        tone: "navy",
      },
      {
        key: "myplans",
        label: "Your leave plans in review",
        count: myPlans,
        path: "/my-hr",
        tone: "muted",
      },
      {
        key: "overdue",
        label: "Overdue milestones",
        count: overdueMilestones,
        path: "/progress-updates",
        tone: "danger",
      },
      {
        key: "payroll",
        label: "Salary changes awaiting approval",
        count: pendingSalary,
        path: "/payroll",
        tone: "gold",
      },
      {
        key: "tasks",
        label: "Open personal tasks",
        count: openTasks,
        path: "/my-hr",
        tone: "navy",
      },
      {
        key: "notifications",
        label: "Unread notifications",
        count: unread,
        path: "/dashboard",
        tone: "muted",
      },
    ].filter((action) => action.count > 0 || ["verification", "payroll"].includes(action.key));

    res.setHeader("Cache-Control", "no-store");
    res.json({
      actions,
      lastVerifiedAt: lastVerified._max.reviewedAt || null,
      currentPeriods: Object.values(current).map((plan) => ({
        type: plan?.type,
        label: plan?.periodLabel,
        title: plan?.title,
      })),
    });
  } catch (e) {
    next(e);
  }
});

export default router;
