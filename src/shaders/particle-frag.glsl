#version 300 es
precision highp float;

uniform float u_Time;

in vec4 fs_Col;
in vec4 fs_Pos;

out vec4 out_Col;

const vec4 a = vec4(0.5, 0.5, 0.5, 1.0);
const vec4 b = vec4(0.5, 0.5, 0.5, 1.0);
const vec4 c = vec4(2.0, 1.0, 0.0, 1.0);
const vec4 d = vec4(0.5, 0.2, 0.25, 1.0);

void main()
{


    float dist = 1.0 - (length(fs_Pos.xyz) * 2.0);
    out_Col = vec4(dist) * ((a + b * cos(2.0 * 3.14159265 * (c * u_Time * 0.005 + d))) * 0.4 + (fs_Col) * 0.6);;
}
