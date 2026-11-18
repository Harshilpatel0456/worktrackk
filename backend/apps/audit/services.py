from apps.audit.models import ActivityLog


def record_activity(
    user,
    action,
    description,
    event_type=ActivityLog.EventType.OTHER,
    employee=None,
    customer=None,
    shift_assignment=None,
    entity_type='',
    entity_id='',
    ip_address=None
):
    """
    Standard service to record an authenticated business activity event.
    Infers employee/customer associations where possible.
    """
    if employee is None and user and hasattr(user, 'employee_profile'):
        employee = user.employee_profile

    if customer is None:
        if user and hasattr(user, 'customer_profile'):
            customer = user.customer_profile
        elif shift_assignment and hasattr(shift_assignment, 'employee_customer_assignment'):
            customer = shift_assignment.employee_customer_assignment.customer

    if employee is None and shift_assignment and hasattr(shift_assignment, 'employee_customer_assignment'):
        employee = shift_assignment.employee_customer_assignment.employee

    return ActivityLog.objects.create(
        user=user,
        employee=employee,
        customer=customer,
        shift_assignment=shift_assignment,
        event_type=event_type,
        action=action,
        entity_type=entity_type or 'SYSTEM',
        entity_id=str(entity_id) if entity_id else '',
        description=description,
        ip_address=ip_address
    )
