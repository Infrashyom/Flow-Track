import Ticket from '../models/Ticket.js';
import User from '../models/User.js';

// Helper to generate next Ticket ID (e.g. TCK-101, TCK-102)
const getNextTicketId = async () => {
  const lastTicket = await Ticket.findOne().sort({ createdAt: -1 });
  if (!lastTicket) return 'TCK-101';
  const parts = lastTicket.id.split('-');
  const lastNum = parseInt(parts[1] || '100', 10);
  return `TCK-${isNaN(lastNum) ? 101 : lastNum + 1}`;
};

export const getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({}).sort({ updatedAt: -1 });
    // Self-healing: Tickets awaiting admin approval must remain in 'Pending Admin Approval' and not 'Resolved'/'Closed'
    for (const t of tickets) {
      if (t.adminPing?.pinged && t.adminPing.status === 'pending' && (t.status === 'Resolved' || t.status === 'Closed')) {
        t.status = 'Pending Admin Approval';
        await t.save();
      }
    }
    res.status(200).json(tickets);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tickets', error: error.message });
  }
};

export const getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ id: req.params.id });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    res.status(200).json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching ticket', error: error.message });
  }
};

export const createTicket = async (req, res) => {
  try {
    const user = req.user;
    const { title, description, category, priority, relatedOrderId, customerName, customerEmail, assignedToId, attachments } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required.' });
    }

    if (!assignedToId) {
      return res.status(400).json({ message: 'Ticket must be assigned to a team member.' });
    }

    const targetUser = await User.findOne({ id: assignedToId });
    if (!targetUser) {
      return res.status(400).json({ message: 'Selected assignee not found.' });
    }

    // Assignee must ALWAYS be from Team or Admin (no Digitizers or Vendors)
    if (targetUser.role === 'Digitizer' || targetUser.role === 'Vendor') {
      return res.status(400).json({
        message: 'Tickets can only be assigned to Team members or Admins (no digitizers or vendors).'
      });
    }

    // Admin can assign to admin or team, but team can assign ONLY to other team member
    if (user.role !== 'Admin' && targetUser.role === 'Admin') {
      return res.status(400).json({
        message: 'Team members can assign only to other team members. Use "Ping Admin" for administrative approvals.'
      });
    }

    const assignedTo = {
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role
    };

    const ticketId = await getNextTicketId();
    const now = new Date();

    const initialAssignment = {
      id: `assign-${Date.now()}-1`,
      fromUser: null,
      toUser: {
        id: targetUser.id,
        name: targetUser.name,
        role: targetUser.role
      },
      assignedBy: {
        id: user.id,
        name: user.name,
        role: user.role
      },
      timestamp: now
    };

    const newTicket = new Ticket({
      id: ticketId,
      title: title.trim(),
      description: description.trim(),
      category: category || 'Customer Inquiry',
      priority: priority || 'Medium',
      status: 'Open',
      relatedOrderId: relatedOrderId ? relatedOrderId.trim() : undefined,
      customerName: customerName ? customerName.trim() : undefined,
      customerEmail: customerEmail ? customerEmail.trim() : undefined,
      createdBy: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      assignedTo,
      adminPing: { pinged: false, status: 'none' },
      attachments: Array.isArray(attachments) ? attachments : [],
      assignmentHistory: [initialAssignment],
      comments: [
        {
          id: `comm-${Date.now()}`,
          authorId: user.id,
          authorName: user.name,
          authorRole: user.role,
          content: `Ticket created by ${user.name} (${user.role}) and assigned to ${targetUser.name}.`,
          createdAt: now
        }
      ],
      timeline: [
        {
          id: `act-${Date.now()}-1`,
          action: 'created',
          actorName: user.name,
          actorRole: user.role,
          details: `Ticket created by ${user.name} (${user.role}) and assigned to ${targetUser.name}`,
          timestamp: now
        }
      ]
    });

    await newTicket.save();
    res.status(201).json(newTicket);
  } catch (error) {
    res.status(500).json({ message: 'Error creating ticket', error: error.message });
  }
};

export const updateTicket = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { title, description, category, priority, status, assignedToId } = req.body;

    const ticket = await Ticket.findOne({ id });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    // Only the ticket creator, assignee, and admin can edit the ticket details and no one else
    const isCreator = ticket.createdBy && ticket.createdBy.id === user.id;
    const isAssignee = ticket.assignedTo && ticket.assignedTo.id === user.id;
    const isAdmin = user.role === 'Admin';
    if (!isCreator && !isAssignee && !isAdmin) {
      return res.status(403).json({ 
        message: 'Only the ticket creator, assignee, or an admin can edit ticket details.' 
      });
    }

    const now = new Date();

    if (title) ticket.title = title.trim();
    if (description) ticket.description = description.trim();
    if (category) ticket.category = category;

    if (priority && priority !== ticket.priority) {
      ticket.timeline.push({
        id: `act-${Date.now()}`,
        action: 'priority_change',
        actorName: user.name,
        actorRole: user.role,
        details: `Priority changed from ${ticket.priority} to ${priority}`,
        timestamp: now
      });
      ticket.priority = priority;
    }

    if (status && status !== ticket.status) {
      // Cannot resolve or close a ticket while it is awaiting Admin approval
      const isAwaitingAdmin = ticket.adminPing?.pinged && ticket.adminPing.status === 'pending';
      if ((status === 'Resolved' || status === 'Closed') && (isAwaitingAdmin || ticket.status === 'Pending Admin Approval')) {
        return res.status(400).json({
          message: 'Cannot resolve a ticket while awaiting Admin approval. Admin must first review and respond to the request.'
        });
      }

      ticket.timeline.push({
        id: `act-${Date.now()}`,
        action: 'status_change',
        actorName: user.name,
        actorRole: user.role,
        details: `Status changed from ${ticket.status} to ${status}`,
        timestamp: now
      });
      ticket.status = status;
      if (status === 'Resolved' || status === 'Closed') {
        ticket.resolvedAt = now;
      }
    }

    if (assignedToId !== undefined) {
      if (!assignedToId) {
        return res.status(400).json({ message: 'Ticket must remain assigned to an eligible team member.' });
      }

      const targetUser = await User.findOne({ id: assignedToId });
      if (!targetUser) {
        return res.status(400).json({ message: 'Target assignee user not found.' });
      }

      // Assignee must ALWAYS be from Team or Admin (no Digitizers or Vendors)
      if (targetUser.role === 'Digitizer' || targetUser.role === 'Vendor') {
        return res.status(400).json({
          message: 'Tickets can only be assigned to Team members or Admins (no digitizers or vendors).'
        });
      }

      // Admin can assign to admin or team, but team can assign ONLY to other team member
      if (user.role !== 'Admin' && targetUser.role === 'Admin') {
        return res.status(400).json({
          message: 'Team members can assign only to other team members. Use "Ping Admin" for administrative approvals.'
        });
      }

      // If different assignee, track the assignment path & history
      if (!ticket.assignedTo || ticket.assignedTo.id !== targetUser.id) {
        const prevAssignee = ticket.assignedTo;
        ticket.assignedTo = {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role
        };

        ticket.assignmentHistory = ticket.assignmentHistory || [];
        ticket.assignmentHistory.push({
          id: `assign-${Date.now()}`,
          fromUser: prevAssignee ? {
            id: prevAssignee.id,
            name: prevAssignee.name,
            role: prevAssignee.role
          } : null,
          toUser: {
            id: targetUser.id,
            name: targetUser.name,
            role: targetUser.role
          },
          assignedBy: {
            id: user.id,
            name: user.name,
            role: user.role
          },
          timestamp: now
        });

        const reassignmentText = prevAssignee 
          ? `Reassigned from ${prevAssignee.name} to ${targetUser.name} by ${user.name}`
          : `Assigned to ${targetUser.name} by ${user.name}`;

        ticket.timeline.push({
          id: `act-${Date.now()}`,
          action: 'reassigned',
          actorName: user.name,
          actorRole: user.role,
          details: reassignmentText,
          timestamp: now
        });

        ticket.comments.push({
          id: `comm-${Date.now()}`,
          authorId: user.id,
          authorName: user.name,
          authorRole: user.role,
          content: `🔄 ${reassignmentText}.`,
          createdAt: now
        });
      }
    }

    await ticket.save();
    res.status(200).json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Error updating ticket', error: error.message });
  }
};

export const pingAdmin = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { requestNote } = req.body;

    if (!requestNote) {
      return res.status(400).json({ message: 'Note for Admin is required' });
    }

    const ticket = await Ticket.findOne({ id });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const now = new Date();
    ticket.adminPing = {
      pinged: true,
      pingedAt: now,
      pingedBy: {
        id: user.id,
        name: user.name,
        role: user.role
      },
      requestNote: requestNote.trim(),
      status: 'pending'
    };

    ticket.status = 'Pending Admin Approval';

    ticket.comments.push({
      id: `comm-${Date.now()}`,
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      content: `🔔 PINGED ADMIN FOR APPROVAL / GUIDANCE:\n"${requestNote.trim()}"`,
      createdAt: now,
      isAdminPing: true
    });

    ticket.timeline.push({
      id: `act-${Date.now()}`,
      action: 'admin_pinged',
      actorName: user.name,
      actorRole: user.role,
      details: `Pinged Admin: "${requestNote.trim()}"`,
      timestamp: now
    });

    await ticket.save();
    res.status(200).json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Error pinging Admin', error: error.message });
  }
};

export const respondToAdminPing = async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== 'Admin') {
      return res.status(403).json({ message: 'Only an Admin can submit an official Admin approval or directive' });
    }

    const { id } = req.params;
    const { action, adminNote, newStatus } = req.body;

    const ticket = await Ticket.findOne({ id });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const now = new Date();
    const isApproved = action === 'approved';

    ticket.adminPing.status = isApproved ? 'approved' : 'rejected';
    ticket.adminPing.adminResponseNote = adminNote || (isApproved ? 'Approved by Admin.' : 'Declined by Admin.');
    ticket.adminPing.respondedAt = now;
    ticket.adminPing.respondedBy = {
      id: user.id,
      name: user.name,
      role: 'Admin'
    };

    // Upon admin approval or rejection, ticket always transitions to 'In Progress' by default
    ticket.status = 'In Progress';

    const prefix = isApproved ? '✅ ADMIN APPROVED REQUEST' : '❌ ADMIN DECLINED REQUEST';
    ticket.comments.push({
      id: `comm-${Date.now()}`,
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      content: `${prefix}:\n${adminNote || (isApproved ? 'Approved without additional notes.' : 'Declined.')}`,
      createdAt: now,
      isAdminResponse: true
    });

    ticket.timeline.push({
      id: `act-${Date.now()}`,
      action: isApproved ? 'admin_approved' : 'admin_declined',
      actorName: user.name,
      actorRole: 'Admin',
      details: `${prefix} - ${adminNote || 'No notes'}`,
      timestamp: now
    });

    await ticket.save();
    res.status(200).json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Error recording admin response', error: error.message });
  }
};

export const addTicketComment = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { content, attachments, isInternal } = req.body;

    if (!content && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ message: 'Comment content or attachment is required' });
    }

    const ticket = await Ticket.findOne({ id });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const now = new Date();
    const newComment = {
      id: `comm-${Date.now()}`,
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      content: content ? content.trim() : '',
      createdAt: now,
      isInternal: Boolean(isInternal),
      attachments: Array.isArray(attachments) ? attachments : []
    };

    ticket.comments.push(newComment);
    ticket.timeline.push({
      id: `act-${Date.now()}`,
      action: 'comment_added',
      actorName: user.name,
      actorRole: user.role,
      details: `Added a comment${isInternal ? ' (internal)' : ''}`,
      timestamp: now
    });

    await ticket.save();
    res.status(200).json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Error adding comment', error: error.message });
  }
};

export const addTicketAttachment = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { name, url, size } = req.body;

    if (!name || !url) {
      return res.status(400).json({ message: 'File name and URL are required' });
    }

    const ticket = await Ticket.findOne({ id });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const now = new Date();
    ticket.attachments.push({
      id: `tatt-${Date.now()}`,
      name,
      url,
      size,
      uploadedBy: user.name,
      uploadedByRole: user.role,
      timestamp: now
    });

    ticket.timeline.push({
      id: `act-${Date.now()}`,
      action: 'attachment_added',
      actorName: user.name,
      actorRole: user.role,
      details: `Attached file: ${name}`,
      timestamp: now
    });

    await ticket.save();
    res.status(200).json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Error adding attachment', error: error.message });
  }
};
