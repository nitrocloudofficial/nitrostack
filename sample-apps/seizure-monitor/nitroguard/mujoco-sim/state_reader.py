"""
state_reader.py
Reads mujoco MjData and produces RobotState JSON matching the
TypeScript interface exactly (camelCase enforced on Python side).
"""
import numpy as np
import math


def get_heading(data) -> float:
    """
    Extract yaw (heading) from quaternion stored in freejoint qpos[3:7].
    qpos layout for freejoint: [x, y, z, qw, qx, qy, qz]
    """
    qw = float(data.qpos[3])
    qx = float(data.qpos[4])
    qy = float(data.qpos[5])
    qz = float(data.qpos[6])
    # yaw from quaternion
    siny_cosp = 2.0 * (qw * qz + qx * qy)
    cosy_cosp = 1.0 - 2.0 * (qy * qy + qz * qz)
    return math.atan2(siny_cosp, cosy_cosp)


def read_state(data, robot_id: str = "AMR-01", mode: str = "AUTO", status: str = "MOVING") -> dict:
    """
    Returns camelCase RobotState dict matching the TypeScript interface:
    {
        robotId, x, y, z, heading,
        linearVelocity, angularVelocity,
        battery, mode, status
    }
    """
    x = float(data.qpos[0])
    y = float(data.qpos[1])
    z = float(data.qpos[2])
    vx = float(data.qvel[0])
    vy = float(data.qvel[1])
    angular_vel = float(data.qvel[5])  # yaw rate from freejoint DOF 5

    return {
        "robotId": robot_id,
        "x": round(x, 4),
        "y": round(y, 4),
        "z": round(z, 4),
        "heading": round(get_heading(data), 4),
        "linearVelocity": round(float(np.linalg.norm([vx, vy])), 4),
        "angularVelocity": round(angular_vel, 4),
        "battery": 82,
        "mode": mode,
        "status": status
    }
