"""
robot_controller.py
Maps (linearVelocity, angularVelocity) from TypeScript ExecutionService
→ force actuator commands (ctrl[0]=fx, ctrl[1]=fy) for MuJoCo freejoint.

Holonomic approximation: we apply force proportional to velocity target,
avoiding full differential-drive wheel contact dynamics. This is an
honest simplification stated in the demo.
"""
import numpy as np
from state_reader import get_heading

# Proportional force gain (tune for responsiveness vs. oscillation)
KP = 40.0


def apply_velocity_command(data, linear_velocity: float, angular_velocity: float):
    """
    Translate a (linearVelocity, angularVelocity) command to MuJoCo actuator forces.
    
    - ctrl[0] (fx): force along world X
    - ctrl[1] (fy): force along world Y
    - angular velocity: directly set yaw-rate by modifying qvel[5]

    Args:
        data:             MuJoCo MjData instance (shared, mutated in-place)
        linear_velocity:  desired forward speed in m/s (from SafetyService CBF output)
        angular_velocity: desired yaw rate in rad/s
    """
    heading = get_heading(data)

    # Decompose linear velocity into world-frame force components
    fx = KP * linear_velocity * np.cos(heading)
    fy = KP * linear_velocity * np.sin(heading)

    data.ctrl[0] = np.clip(fx, -50, 50)
    data.ctrl[1] = np.clip(fy, -50, 50)

    # Apply angular velocity directly to yaw DOF (DOF 5 for freejoint)
    data.qvel[5] = angular_velocity
